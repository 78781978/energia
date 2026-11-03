import "server-only";
import { db } from "./db";
import { hashToken, newToken } from "./auth";
import { sendMail } from "./mail";
import { SITE } from "./site";

/** Wysyła link potwierdzający adres e-mail (ważny 72 godziny). */
export async function sendVerification(userId: string, email: string): Promise<void> {
  const token = newToken();
  await db.emailToken.deleteMany({ where: { userId, purpose: "VERIFY", usedAt: null } });
  await db.emailToken.create({ data: { id: hashToken(token), userId, purpose: "VERIFY", expiresAt: new Date(Date.now() + 72 * 3600e3) } });
  await sendMail({
    to: email,
    subject: `Potwierdź adres e-mail – ${SITE.portalBrand}`,
    text: `Dzień dobry,\n\ndziękujemy za rejestrację w portalu ${SITE.portalBrand}.\n\nPotwierdź adres e-mail, aby wybierać oferty i podpisywać umowy (link ważny 72 godziny):\n${SITE.url}/portal/potwierdz/?token=${token}\n\nJeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość.`,
  });
}

export async function confirmEmailToken(token: string): Promise<"ok" | "invalid"> {
  const rec = await db.emailToken.findUnique({ where: { id: hashToken(token) } });
  if (!rec || rec.purpose !== "VERIFY" || rec.usedAt || rec.expiresAt < new Date()) return "invalid";
  await db.$transaction([
    db.emailToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return "ok";
}
