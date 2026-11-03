import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";

const COOKIE = "eo_session";
const SESSION_DAYS = 14;

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
  const expiresAt = new Date(Date.now() + (remember ? SESSION_DAYS * 864e5 : 12 * 3600e3));
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
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { select: { id: true, email: true, role: true, name: true, phone: true, isActive: true, emailVerifiedAt: true, avatarStoredName: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { isActive: _a, ...user } = session.user;
  return user;
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

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/portal/logowanie/?next=/admin/");
  if (user.role !== "ADMIN") redirect("/portal/");
  return user;
}

/* Prosty limit prób (w pamięci procesu) – chroni logowanie i formularze przed zgadywaniem. */
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 8, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
