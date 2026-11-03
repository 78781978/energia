import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * Ciasteczko sesji. W produkcji z prefiksem __Host- – przeglądarka przyjmie je tylko przez HTTPS,
 * bez atrybutu Domain i dla ścieżki „/” (nie da się go podłożyć z subdomeny).
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-eo_session" : "eo_session";
const COOKIE = SESSION_COOKIE;
const SESSION_DAYS = 14;
const ADMIN_SESSION_HOURS = 12;

/** Logowanie dwuetapowe obowiązkowe dla administratorów (domyślnie w produkcji; ADMIN_2FA_REQUIRED=0 wyłącza, =1 wymusza). */
export function adminTwoFactorRequired(): boolean {
  const v = process.env.ADMIN_2FA_REQUIRED;
  if (v === "0") return false;
  if (v === "1") return true;
  return process.env.NODE_ENV === "production";
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

/**
 * Tworzy sesję. `remember` = „Zapamiętaj mnie”: ciasteczko trwałe na 14 dni.
 * Bez zaznaczenia: ciasteczko sesyjne (znika po zamknięciu przeglądarki), ważne najwyżej 12 godzin.
 */
export async function createSession(userId: string, remember = true): Promise<void> {
  const token = newToken();
  const role = (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role;
  // Sesje administratorów zawsze krótkie (12 h) i tylko do zamknięcia przeglądarki
  if (role === "ADMIN") remember = false;
  const expiresAt = new Date(Date.now() + (remember ? SESSION_DAYS * 864e5 : (role === "ADMIN" ? ADMIN_SESSION_HOURS : 12) * 3600e3));
  const ua = (await headers()).get("user-agent")?.slice(0, 250) ?? null;
  await db.session.create({ data: { id: hashToken(token), userId, expiresAt, userAgent: ua, persistent: remember } });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  name: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  avatarStoredName: string | null;
  twoFactor: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, role: true, name: true, phone: true, isActive: true, emailVerifiedAt: true, avatarStoredName: true, totpEnabledAt: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { isActive: _a, totpEnabledAt, ...user } = session.user;
  return { ...user, twoFactor: Boolean(totpEnabledAt) };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/logowanie/");
  return user;
}

export async function requireClient(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/admin/");
  return user;
}

/**
 * Dostęp do panelu administratora. Gdy 2FA jest obowiązkowe, administrator bez 2FA trafia
 * na stronę konfiguracji (/admin/konto/) – wszystkie inne strony i akcje są dla niego zablokowane.
 */
export async function requireAdmin(opts: { allowWithout2fa?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/logowanie/?next=/admin/");
  if (user.role !== "ADMIN") redirect("/portal/");
  if (!opts.allowWithout2fa && !user.twoFactor && adminTwoFactorRequired()) redirect("/admin/konto/?wymagane2fa=1");
  return user;
}

/** Dla tras API: administrator z 2FA (gdy wymagane) albo null. */
export async function adminOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  if (!user.twoFactor && adminTwoFactorRequired()) return null;
  return user;
}

/**
 * Limit prób zapisywany w bazie (działa po restarcie aplikacji i przy wielu procesach serwera).
 * Zwraca false, gdy limit w oknie czasowym został przekroczony.
 */
export async function rateLimit(key: string, max = 8, windowMs = 15 * 60 * 1000): Promise<boolean> {
  const now = new Date();
  const k = key.slice(0, 190);
  try {
    const bumped = await db.rateLimit.updateMany({ where: { key: k, until: { gt: now } }, data: { count: { increment: 1 } } });
    if (bumped.count === 0) {
      await db.rateLimit.upsert({ where: { key: k }, update: { count: 1, until: new Date(now.getTime() + windowMs) }, create: { key: k, count: 1, until: new Date(now.getTime() + windowMs) } });
      if (Math.random() < 0.02) await db.rateLimit.deleteMany({ where: { until: { lt: now } } }); // sprzątanie
      return true;
    }
    const row = await db.rateLimit.findUnique({ where: { key: k } });
    return (row?.count ?? 0) <= max;
  } catch (e) {
    console.error("[rateLimit]", e);
    return true; // awaria bazy nie może blokować logowania – pozostałe zabezpieczenia działają
  }
}

/**
 * Adres IP klienta. Nagłówki X-Forwarded-For może podrobić każdy, dlatego:
 * - za Cloudflare (BEHIND_CLOUDFLARE=1) bierzemy CF-Connecting-IP,
 * - w pozostałych przypadkach OSTATNI adres z X-Forwarded-For (dopisany przez serwer hostingu), a nie pierwszy.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  if (process.env.BEHIND_CLOUDFLARE === "1") {
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf.trim().slice(0, 64);
  }
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1].slice(0, 64);
  }
  return (h.get("x-real-ip") || "local").slice(0, 64);
}
