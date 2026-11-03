"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyTotp } from "@/lib/totp";
import { db } from "@/lib/db";
import { clientIp, createSession, destroySession, hashPassword, hashToken, newToken, rateLimit, verifyPassword } from "@/lib/auth";
import { sendMail } from "@/lib/mail";
import { isValidEmail, passwordProblem, str } from "@/lib/validators";
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
  const remember = fd.get("remember") === "on";
  const next = safeNext(str(fd.get("next")), user.role === "ADMIN" ? "/admin/" : "/portal/");
  if (user.totpEnabledAt && user.totpSecret) {
    // Drugi krok logowania – kod z aplikacji uwierzytelniającej
    const token = newToken();
    await db.emailToken.create({
      data: { id: hashToken(token), userId: user.id, purpose: "LOGIN_2FA", data: JSON.stringify({ remember, next }), expiresAt: new Date(Date.now() + 10 * 60e3) },
    });
    (await cookies()).set(TWO_FA_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/portal/", maxAge: 600 });
    redirect("/portal/logowanie/kod/");
  }
  await createSession(user.id, remember);
  redirect(next);
}

const TWO_FA_COOKIE = "eo_2fa";

export async function verifyTwoFactor(_prev: FormState, fd: FormData): Promise<FormState> {
  const jar = await cookies();
  const token = jar.get(TWO_FA_COOKIE)?.value;
  const rec = token ? await db.emailToken.findUnique({ where: { id: hashToken(token) } }) : null;
  if (!rec || rec.purpose !== "LOGIN_2FA" || rec.usedAt || rec.expiresAt < new Date()) return { error: "Sesja logowania wygasła. Zaloguj się ponownie.", fieldErrors: { expired: "1" } };
  if (!rateLimit(`2fa:${rec.userId}`, 6, 10 * 60e3)) return { error: "Zbyt wiele błędnych kodów. Zaloguj się ponownie za kilka minut." };
  const user = await db.user.findUnique({ where: { id: rec.userId } });
  if (!user || !user.isActive || !user.totpSecret) return { error: "Nie można dokończyć logowania." };
  const code = str(fd.get("code"), 20).toUpperCase();
  let ok = verifyTotp(user.totpSecret, code);
  if (!ok && /^[0-9A-F]{5}-?[0-9A-F]{5}$/.test(code)) {
    const hashes: string[] = JSON.parse(user.backupCodes || "[]");
    const h = hashToken(code.replace("-", ""));
    if (hashes.includes(h)) {
      ok = true;
      await db.user.update({ where: { id: user.id }, data: { backupCodes: JSON.stringify(hashes.filter((x) => x !== h)) } });
    }
  }
  if (!ok) return { error: "Nieprawidłowy kod. Sprawdź aplikację uwierzytelniającą lub użyj kodu zapasowego." };
  const meta = JSON.parse(rec.data || "{}") as { remember?: boolean; next?: string };
  await db.emailToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  jar.delete({ name: TWO_FA_COOKIE, path: "/portal/" });
  await createSession(user.id, Boolean(meta.remember));
  redirect(safeNext(meta.next ?? null, user.role === "ADMIN" ? "/admin/" : "/portal/"));
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
