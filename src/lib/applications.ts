import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { notifyTeam, sendMail } from "./mail";
import { STATUS_HELP, STATUS_LABEL, type AppStatus } from "./constants";
import { SITE } from "./site";

export async function nextApplicationNumber(client: Prisma.TransactionClient = db): Promise<string> {
  const year = new Date().getFullYear();
  const count = await client.application.count({ where: { number: { startsWith: `EO/${year}/` } } });
  return `EO/${year}/${String(count + 1).padStart(4, "0")}`;
}

/** Zmiana statusu z wpisem do historii i (opcjonalnie) powiadomieniem klienta. */
export async function setStatus(opts: { applicationId: string; to: AppStatus; actorId: string | null; comment?: string | null; notify?: boolean }) {
  const app = await db.application.findUniqueOrThrow({ where: { id: opts.applicationId }, include: { user: true } });
  if (app.status === opts.to) return app;
  await db.$transaction([
    db.application.update({ where: { id: app.id }, data: { status: opts.to } }),
    db.statusChange.create({
      data: { applicationId: app.id, fromStatus: app.status, toStatus: opts.to, changedById: opts.actorId, comment: opts.comment || null },
    }),
    db.auditLog.create({
      data: {
        actorId: opts.actorId,
        entityType: "Application",
        entityId: app.id,
        action: "status",
        changes: JSON.stringify({ status: [app.status, opts.to] }),
      },
    }),
  ]);
  if (opts.notify !== false) {
    await sendMail({
      to: app.user.email,
      subject: `Wniosek ${app.number}: ${STATUS_LABEL[opts.to]}`,
      text: `Dzień dobry,\n\nstatus Twojego wniosku ${app.number} zmienił się na: ${STATUS_LABEL[opts.to]}.\n${STATUS_HELP[opts.to]}${opts.comment ? `\n\nKomentarz doradcy: ${opts.comment}` : ""}\n\nSzczegóły: ${SITE.url}/portal/wnioski/${app.id}/`,
    });
  }
  return app;
}

export async function audit(actorId: string | null, entityType: string, entityId: string, action: string, changes?: Record<string, [unknown, unknown]>) {
  await db.auditLog.create({
    data: { actorId, entityType, entityId, action, changes: changes && Object.keys(changes).length ? JSON.stringify(changes) : null },
  });
}

/** Porównuje dwa obiekty i zwraca tylko zmienione pola – do logu zmian. */
export function diff<T extends Record<string, unknown>>(before: T, after: Partial<T>): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(after)) {
    const a = before[k] instanceof Date ? (before[k] as Date).toISOString() : before[k];
    const b = after[k] instanceof Date ? (after[k] as Date).toISOString() : after[k];
    if ((a ?? null) !== (b ?? null)) out[k] = [a ?? null, b ?? null];
  }
  return out;
}

export async function notifyNewApplication(appId: string) {
  const app = await db.application.findUniqueOrThrow({ where: { id: appId }, include: { company: true, user: true, points: true } });
  await notifyTeam(
    `Nowy wniosek ${app.number} – ${app.company.name}`,
    `Firma: ${app.company.name} (NIP ${app.company.nip})\nKontakt: ${app.company.contactName ?? "-"}, ${app.company.contactPhone ?? "-"}, ${app.user.email}\nPunkty poboru: ${app.points.length}\nRozmowa z doradcą: ${app.wantsCall ? "TAK" : "nie"}\n\n${SITE.url}/admin/wnioski/${app.id}/`,
  );
  await sendMail({
    to: app.user.email,
    subject: `Potwierdzenie złożenia wniosku ${app.number}`,
    text: `Dzień dobry,\n\ndziękujemy – Twój wniosek ${app.number} dla firmy ${app.company.name} został utworzony.\n\nCo dalej? Doradca zweryfikuje dane i przygotuje oferty. O każdej zmianie statusu poinformujemy Cię e-mailem.\n\nStatus wniosku: ${SITE.url}/portal/wnioski/${app.id}/`,
  });
}
