"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, hashPassword, hashToken, rateLimit, requireClient, requireUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { audit } from "@/lib/applications";
import { notifyTeam, sendMail } from "@/lib/mail";
import { sendVerification } from "@/lib/verify";
import { newBackupCodes, newTotpSecret, verifyTotp } from "@/lib/totp";
import { removeStored, saveImage, UploadError } from "@/lib/storage";
import { passwordProblem, str } from "@/lib/validators";
import { LEAD_TYPES } from "@/lib/constants";
import type { FormState } from "@/lib/forms";
import { SITE } from "@/lib/site";

export async function resendVerification(): Promise<void> {
  const user = await requireClient();
  if (user.emailVerifiedAt) return;
  if (!await rateLimit(`verify:${user.id}`, 3, 60 * 60e3)) return;
  await sendVerification(user.id, user.email);
}

/* ------------------------------------------------------------ hasło */

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!await rateLimit(`pw:${user.id}`, 6, 15 * 60e3)) return { error: "Zbyt wiele prób. Spróbuj ponownie za 15 minut." };
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const current = String(fd.get("current") ?? "");
  const pw = String(fd.get("password") ?? "");
  if (!(await verifyPassword(current, me.passwordHash))) return { error: "Obecne hasło jest nieprawidłowe.", fieldErrors: { current: "Nieprawidłowe hasło." } };
  const pp = passwordProblem(pw);
  if (pp) return { error: pp, fieldErrors: { password: pp } };
  if (pw !== String(fd.get("password2") ?? "")) return { error: "Hasła nie są takie same.", fieldErrors: { password2: "Hasła nie są takie same." } };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(pw) } }),
    // wyloguj pozostałe urządzenia
    db.session.deleteMany({ where: { userId: user.id, ...(token ? { id: { not: hashToken(token) } } : {}) } }),
  ]);
  await audit(user.id, "User", user.id, "password_changed");
  await sendMail({ to: user.email, subject: "Hasło zostało zmienione", text: `Hasło do portalu ${SITE.portalBrand} zostało zmienione. Jeśli to nie Ty, natychmiast skontaktuj się z nami.` });
  return { ok: true, message: "Hasło zostało zmienione. Pozostałe urządzenia zostały wylogowane." };
}

/* ------------------------------------------------------------ logowanie dwuetapowe */

export async function begin2fa(): Promise<void> {
  const user = await requireUser();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (me.totpEnabledAt) return;
  await db.user.update({ where: { id: user.id }, data: { totpSecret: newTotpSecret() } });
  revalidatePath("/portal/konto/");
  revalidatePath("/admin/konto/");
}

export async function confirm2fa(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!me.totpSecret || me.totpEnabledAt) return { error: "Rozpocznij konfigurację ponownie." };
  if (!await rateLimit(`2fa-setup:${user.id}`, 10, 15 * 60e3)) return { error: "Zbyt wiele prób. Spróbuj za kilka minut." };
  if (!verifyTotp(me.totpSecret, str(fd.get("code"), 10))) return { error: "Kod jest nieprawidłowy. Sprawdź, czy czas w telefonie jest ustawiony automatycznie.", fieldErrors: { code: "Nieprawidłowy kod." } };
  const codes = newBackupCodes();
  await db.user.update({
    where: { id: user.id },
    data: { totpEnabledAt: new Date(), backupCodes: JSON.stringify(codes.map((c) => hashToken(c.replace("-", "")))) },
  });
  await audit(user.id, "User", user.id, "2fa_enabled");
  await sendMail({ to: user.email, subject: "Włączono logowanie dwuetapowe", text: `Logowanie dwuetapowe w portalu ${SITE.portalBrand} zostało włączone.` });
  return { ok: true, message: "Logowanie dwuetapowe jest włączone.", values: { codes: codes.join(" ") } };
}

export async function disable2fa(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(String(fd.get("password") ?? ""), me.passwordHash))) return { error: "Nieprawidłowe hasło.", fieldErrors: { password: "Nieprawidłowe hasło." } };
  if (user.role === "ADMIN" && (await import("@/lib/auth")).adminTwoFactorRequired())
    return { error: "Dla administratorów logowanie dwuetapowe jest obowiązkowe – nie można go wyłączyć." };
  await db.user.update({ where: { id: user.id }, data: { totpEnabledAt: null, totpSecret: null, backupCodes: null } });
  await audit(user.id, "User", user.id, "2fa_disabled");
  await sendMail({ to: user.email, subject: "Wyłączono logowanie dwuetapowe", text: `Logowanie dwuetapowe w portalu ${SITE.portalBrand} zostało wyłączone. Jeśli to nie Ty, zmień hasło i skontaktuj się z nami.` });
  revalidatePath("/portal/konto/");
  revalidatePath("/admin/konto/");
  return { ok: true, message: "Logowanie dwuetapowe zostało wyłączone." };
}

/* ------------------------------------------------------------ zgody i RODO */

export async function updateConsents(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  const data = { marketingConsent: fd.get("marketingEmail") === "on", smsConsent: fd.get("sms") === "on", newsletterConsent: fd.get("newsletter") === "on" };
  await db.user.update({ where: { id: user.id }, data: { ...data, consentsUpdatedAt: new Date() } });
  const sub = await db.newsletterSubscriber.findUnique({ where: { email: user.email } });
  if (data.newsletterConsent && (!sub || sub.unsubscribedAt))
    await db.newsletterSubscriber.upsert({
      where: { email: user.email },
      update: { unsubscribedAt: null },
      create: { email: user.email, source: "portal", unsubscribeToken: randomBytes(24).toString("base64url") },
    });
  if (!data.newsletterConsent && sub && !sub.unsubscribedAt) await db.newsletterSubscriber.update({ where: { email: user.email }, data: { unsubscribedAt: new Date() } });
  const changes: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(data) as (keyof typeof data)[]) if (before[k] !== data[k]) changes[k] = [before[k], data[k]];
  await audit(user.id, "User", user.id, "consents", { ...changes, ip: [null, await clientIp()] });
  revalidatePath("/portal/konto/");
  return { ok: true, message: "Zapisano zgody." };
}

export async function requestDeletion(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!fd.get("confirm")) return { error: "Zaznacz potwierdzenie.", fieldErrors: { confirm: "Wymagane." } };
  if (!(await verifyPassword(String(fd.get("password") ?? ""), me.passwordHash))) return { error: "Nieprawidłowe hasło.", fieldErrors: { password: "Nieprawidłowe hasło." } };
  await db.user.update({ where: { id: user.id }, data: { deletionRequestedAt: new Date(), marketingConsent: false, smsConsent: false, newsletterConsent: false, consentsUpdatedAt: new Date() } });
  await db.newsletterSubscriber.updateMany({ where: { email: user.email, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
  await audit(user.id, "User", user.id, "deletion_requested");
  await notifyTeam(
    `Wniosek o usunięcie konta (RODO) – ${user.email}`,
    `Klient ${user.email} wycofał zgody i poprosił o usunięcie konta.\nSprawdź, czy dane muszą być przechowywane (np. umowy, rozliczenia), i odpowiedz w ciągu 30 dni.\n${SITE.url}/admin/klienci/`,
  );
  await sendMail({ to: user.email, subject: "Otrzymaliśmy wniosek o usunięcie konta", text: "Dziękujemy. Zgody marketingowe zostały wycofane. Wniosek o usunięcie danych rozpatrzymy w ciągu 30 dni i potwierdzimy e-mailem." });
  revalidatePath("/portal/konto/");
  return { ok: true, message: "Wniosek został przyjęty. Odpowiemy w ciągu 30 dni." };
}

/* ------------------------------------------------------------ logo / zdjęcie */

export async function uploadAvatar(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const file = fd.get("avatar");
  if (fd.get("remove") === "1") {
    if (user.avatarStoredName) await removeStored(user.avatarStoredName);
    await db.user.update({ where: { id: user.id }, data: { avatarStoredName: null } });
    revalidatePath("/portal/", "layout");
    return { ok: true, message: "Usunięto logo." };
  }
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik." };
  if (file.size > 2 * 1024 * 1024) return { error: "Logo może mieć maksymalnie 2 MB." };
  try {
    const img = await saveImage(file);
    if (user.avatarStoredName) await removeStored(user.avatarStoredName);
    await db.user.update({ where: { id: user.id }, data: { avatarStoredName: img.storedName } });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  revalidatePath("/portal/", "layout");
  return { ok: true, message: "Zapisano logo." };
}

/* ------------------------------------------------------------ zapytania z portalu */

const PORTAL_LEADS = ["PRODUKT_TECHNICZNY", "POMOC_PRAWNA", "ROZMOWA"] as const;

export async function portalEnquiry(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const type = str(fd.get("type"), 30);
  if (!(PORTAL_LEADS as readonly string[]).includes(type)) return { error: "Wybierz rodzaj zapytania." };
  const topic = str(fd.get("topic"), 200);
  const message = str(fd.get("message"), 4000);
  if (message.length < 5 && !topic) return { error: "Opisz krótko, w czym możemy pomóc.", fieldErrors: { message: "Opisz potrzebę." } };
  if (!await rateLimit(`enq:${user.id}`, 6, 30 * 60e3)) return { error: "Wysłano już kilka zapytań. Spróbuj za chwilę." };
  const company = await db.company.findFirst({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } });
  const lead = await db.lead.create({
    data: {
      type,
      userId: user.id,
      name: user.name || company?.contactName || user.email,
      company: company?.name ?? null,
      nip: company?.nip ?? null,
      email: user.email,
      phone: user.phone ?? company?.contactPhone ?? null,
      topic: topic || null,
      message: message || null,
      pagePath: "/portal/",
    },
  });
  const label = LEAD_TYPES[type as keyof typeof LEAD_TYPES];
  await notifyTeam(`Zapytanie z portalu: ${label} – ${company?.name ?? user.email}`, `${label}\nTemat: ${topic || "-"}\n\n${message}\n\n${SITE.url}/admin/zapytania/${lead.id}/`);
  return { ok: true, message: "Dziękujemy! Ekspert skontaktuje się z Tobą w ciągu jednego dnia roboczego." };
}
