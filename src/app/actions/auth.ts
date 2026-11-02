"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientIp, createSession, destroySession, hashPassword, hashToken, newToken, rateLimit, verifyPassword } from "@/lib/auth";
import { readAttribution } from "@/lib/attribution";
import { sendMail } from "@/lib/mail";
import { isValidEmail, isValidPhone, passwordProblem, str } from "@/lib/validators";
import type { FormState } from "@/lib/forms";
import { SITE } from "@/lib/site";

function safeNext(next: string | null, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get("email"), 200).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const values = { email };
  if (!isValidEmail(email) || !password) return { error: "Wpisz adres e-mail i hasło.", values };
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}:${email}`, 8) || !rateLimit(`login-ip:${ip}`, 30))
    return { error: "Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut lub zresetuj hasło.", values };
  const user = await db.user.findUnique({ where: { email } });
  // Porównanie wykonujemy zawsze, aby czas odpowiedzi nie zdradzał, czy konto istnieje.
  const ok = user ? await verifyPassword(password, user.passwordHash) : (await hashPassword(password), false);
  if (!user || !ok || !user.isActive) return { error: "Nieprawidłowy e-mail lub hasło.", values };
  await createSession(user.id);
  redirect(safeNext(str(fd.get("next")), user.role === "ADMIN" ? "/admin/" : "/portal/"));
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = {
    email: str(fd.get("email"), 200).toLowerCase(),
    phone: str(fd.get("phone"), 30),
    name: str(fd.get("name"), 120),
  };
  const password = String(fd.get("password") ?? "");
  const fe: Record<string, string> = {};
  if (!isValidEmail(values.email)) fe.email = "Wpisz poprawny adres e-mail.";
  const pp = passwordProblem(password);
  if (pp) fe.password = pp;
  if (password !== String(fd.get("password2") ?? "")) fe.password2 = "Hasła nie są takie same.";
  if (values.phone && !isValidPhone(values.phone)) fe.phone = "Wpisz poprawny numer telefonu.";
  if (!fd.get("terms")) fe.terms = "Akceptacja regulaminu jest wymagana.";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe, values };
  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60 * 1000)) return { error: "Zbyt wiele prób. Spróbuj ponownie później.", values };

  const exists = await db.user.findUnique({ where: { email: values.email } });
  if (exists) return { error: "Konto z tym adresem już istnieje. Zaloguj się lub zresetuj hasło.", fieldErrors: { email: "Ten adres jest już zarejestrowany." }, values };

  const user = await db.user.create({
    data: {
      email: values.email,
      passwordHash: await hashPassword(password),
      phone: values.phone || null,
      name: values.name || null,
      marketingConsent: Boolean(fd.get("marketing")),
      source: await readAttribution(),
    },
  });
  await sendMail({
    to: user.email,
    subject: `Witamy w portalu ${SITE.portalBrand}`,
    text: `Dzień dobry,\n\nTwoje konto w portalu ${SITE.portalBrand} zostało utworzone.\n\nKolejny krok: wypełnij wniosek o ofertę – podaj dane firmy i punktów poboru albo prześlij fakturę.\n${SITE.url}/portal/wniosek/\n\nW razie pytań odpowiedz na tę wiadomość.`,
  });
  await createSession(user.id);
  redirect("/portal/wniosek/?nowe=1");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/portal/logowanie/?wylogowano=1");
}

export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get("email"), 200).toLowerCase();
  if (!isValidEmail(email)) return { error: "Wpisz poprawny adres e-mail.", values: { email } };
  if (!rateLimit(`reset:${await clientIp()}`, 5, 60 * 60 * 1000)) return { error: "Zbyt wiele prób. Spróbuj ponownie później." };
  const user = await db.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const token = newToken();
    await db.passwordResetToken.create({ data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await sendMail({
      to: email,
      subject: "Ustaw nowe hasło",
      text: `Otrzymaliśmy prośbę o zmianę hasła do portalu ${SITE.portalBrand}.\n\nUstaw nowe hasło (link ważny 60 minut):\n${SITE.url}/portal/nowe-haslo/?token=${token}\n\nJeśli to nie Ty, zignoruj tę wiadomość.`,
    });
  }
  // Ta sama odpowiedź niezależnie od istnienia konta.
  return { ok: true, message: "Jeśli konto z tym adresem istnieje, wysłaliśmy link do ustawienia nowego hasła." };
}

export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd.get("token"), 200);
  const password = String(fd.get("password") ?? "");
  const pp = passwordProblem(password);
  if (pp) return { error: pp, fieldErrors: { password: pp } };
  if (password !== String(fd.get("password2") ?? "")) return { error: "Hasła nie są takie same.", fieldErrors: { password2: "Hasła nie są takie same." } };
  const rec = await db.passwordResetToken.findUnique({ where: { id: hashToken(token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) return { error: "Link wygasł lub został już użyty. Poproś o nowy." };
  await db.$transaction([
    db.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: rec.userId } }),
  ]);
  return { ok: true, message: "Hasło zostało zmienione. Możesz się zalogować." };
}
