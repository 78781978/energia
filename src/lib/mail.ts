import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE } from "./site";

type Mail = { to: string; subject: string; text: string };

let transporter: Transporter | null = null;
function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

const FOOTER = `\n\n—\n${SITE.brand}\n${SITE.url}\n\nTa wiadomość została wysłana automatycznie.`;

/** Wysyła e-mail. Bez konfiguracji SMTP tylko zapisuje treść w logu (tryb deweloperski). */
export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const t = getTransport();
  const body = text + FOOTER;
  if (!t) {
    console.info(`[mail:dev] Do: ${to}\nTemat: ${subject}\n${body}\n`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || SITE.brand, to, subject, text: body });
  } catch (e) {
    console.error("[mail] Błąd wysyłki", e);
  }
}

export async function notifyTeam(subject: string, text: string) {
  const to = process.env.NOTIFY_EMAIL;
  if (to) await sendMail({ to, subject, text });
  else console.info(`[mail:team] ${subject}\n${text}`);
}
