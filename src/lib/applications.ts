import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { notifyTeam, sendMail } from "./mail";
import { MEDIA, PRICE_MODELS, STATUS_HELP, STATUS_LABEL, type AppStatus } from "./constants";
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

/** Wysyła zamówienie z portalu do Livespace: kontakt (firma, osoba, dane energetyczne) + zadanie dla handlowca. */
export async function syncApplicationToCrm(appId: string): Promise<void> {
  const { livespaceConfigured, pushLeadToLivespace } = await import("./livespace");
  if (!livespaceConfigured()) return;
  const app = await db.application.findUniqueOrThrow({
    where: { id: appId },
    include: { company: true, user: true, points: { include: { point: true } }, documents: true },
  });
  const { signedFileUrl } = await import("./file-links");
  const c = app.company;
  const media = MEDIA[app.media as keyof typeof MEDIA] ?? app.media;
  const models = (app.priceModels ?? app.priceModel)
    .split(",")
    .filter(Boolean)
    .map((m) => PRICE_MODELS[m as keyof typeof PRICE_MODELS]?.label ?? m)
    .join(", ");
  const num = (n: number | null | undefined, unit = "MWh") => (n == null ? "–" : `${String(n).replace(".", ",")} ${unit}`);
  const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
  const addr = (a: (string | null | undefined)[]) => a.filter(Boolean).join(", ");
  const invoices = app.documents.filter((d) => d.kind === "FAKTURA");
  const details = [
    `ZAMÓWIENIE Z PORTALU ${app.number} (${media}) – ${day(app.createdAt)}`,
    `Lata dostaw: ${app.years.replace(/,/g, ", ")}`,
    `Model ceny: ${models}`,
    app.tariff && `Prąd – taryfa ${app.tariff}, zużycie roczne ${num(app.annualUsageMWh)}`,
    app.tariffGas && `Gaz – taryfa ${app.tariffGas}, zużycie roczne ${num(app.annualUsageGasMWh)}`,
    "",
    "FIRMA",
    `${c.name}, NIP ${c.nip}${c.regon ? `, REGON ${c.regon}` : ""}${c.legalForm ? `, ${c.legalForm}` : ""}`,
    `Siedziba: ${addr([c.hqStreet, c.hqPostalCode, c.hqCity]) || "–"}`,
    !c.corrSameAsHq && `Adres korespondencyjny: ${addr([c.corrStreet, c.corrPostalCode, c.corrCity])}`,
    `Osoba kontaktowa: ${[c.contactName, c.contactPhone, c.contactEmail ?? app.user.email].filter(Boolean).join(", ")}`,
    "",
    `PUNKTY POBORU (${app.points.length})`,
    ...app.points.map(({ point: p }) =>
      [
        `• ${p.medium === "GAZ" ? "Gaz – PPG" : "Prąd – PPE"} ${p.ppeNumber ?? "–"}`,
        p.name && `„${p.name}”`,
        p.meterNumber && `licznik ${p.meterNumber}`,
        p.tariff && `taryfa ${p.tariff}`,
        p.annualUsageMWh != null && `zużycie ${num(p.annualUsageMWh)}`,
        p.contractedPowerKw != null && `moc umowna ${num(p.contractedPowerKw, "kW")}`,
        p.currentSeller && `sprzedawca: ${p.currentSeller}`,
        p.operator && `OSD: ${p.operator}`,
        p.contractEndDate && `umowa do ${day(p.contractEndDate)}`,
        p.noticeDays != null && `wypowiedzenie ${p.noticeDays} dni`,
        addr([p.street, p.postalCode, p.city]) && `adres: ${addr([p.street, p.postalCode, p.city])}`,
      ]
        .filter(Boolean)
        .join(", "),
    ),
    "",
    invoices.length ? `Faktury (${invoices.length}, dołączone w plikach): ${invoices.map((d) => d.fileName).join("; ")}` : "Faktury: brak",
    app.wantsCall ? "Klient prosi o rozmowę z doradcą." : null,
    app.clientComment && `Komentarz klienta: ${app.clientComment}`,
    `Zgody: informacje handlowe e-mail – ${app.user.marketingConsent ? "tak" : "nie"}, SMS – ${app.user.smsConsent ? "tak" : "nie"}, newsletter – ${app.user.newsletterConsent ? "tak" : "nie"}`,
    app.source && `Źródło: ${app.source}`,
  ].filter((x) => x !== false && x !== null && x !== undefined) as string[];
  const firstPower = app.points.find((x) => x.point.medium === "PRAD")?.point;
  const firstGas = app.points.find((x) => x.point.medium === "GAZ")?.point;
  const fields = {
    taryfa: app.tariff,
    zuzycie: app.annualUsageMWh != null ? num(app.annualUsageMWh) : null,
    taryfa_gaz: app.tariffGas,
    zuzycie_gaz: app.annualUsageGasMWh != null ? num(app.annualUsageGasMWh) : null,
    sprzedawca_gaz: [firstGas?.currentSeller, app.annualUsageGasMWh != null ? num(app.annualUsageGasMWh) : null].filter(Boolean).join(" / ") || null,
    koniec_umowy_gaz: day(firstGas?.contractEndDate),
    wolumen: [app.annualUsageMWh != null && `prąd ${num(app.annualUsageMWh)}`, app.annualUsageGasMWh != null && `gaz ${num(app.annualUsageGasMWh)}`].filter(Boolean).join(", ") || null,
    osoba_kontaktowa: [c.contactName, c.contactPhone, c.contactEmail ?? app.user.email].filter(Boolean).join(", ") || null,
    ppe: app.points.map((x) => x.point.ppeNumber).filter(Boolean).join(", "),
    sprzedawca: firstPower?.currentSeller ?? null,
    osd: firstPower?.operator ?? null,
    koniec_umowy: day(firstPower?.contractEndDate),
    moc_umowna: firstPower?.contractedPowerKw != null ? String(firstPower.contractedPowerKw) : null,
    lata: app.years.replace(/,/g, ", "),
    model_ceny: models,
  };
  const files = invoices
    .map((d) => ({ name: d.fileName, url: signedFileUrl(d.id) }))
    .filter((f): f is { name: string; url: string } => !!f.url);
  try {
    const r = await pushLeadToLivespace({
      kind: "WNIOSEK",
      kindLabel: "Zamówienie z portalu",
      name: app.company.contactName,
      company: app.company.name,
      nip: app.company.nip,
      regon: app.company.regon,
      email: app.company.contactEmail ?? app.user.email,
      phone: app.company.contactPhone,
      address: { street: app.company.hqStreet, postcode: app.company.hqPostalCode, city: app.company.hqCity },
      details,
      fields,
      files,
      taskTitle: `Portal – nowe zamówienie ${app.number}: ${app.company.name}${app.wantsCall ? " (prosi o telefon)" : ""}`,
      adminUrl: `${SITE.url}/admin/wnioski/${app.id}/`,
    });
    await db.application.update({ where: { id: appId }, data: { crmId: r.contactId, crmError: null } });
  } catch (e) {
    const msg = (e as Error).message.slice(0, 500);
    console.error("[livespace] wniosek:", msg);
    await db.application.update({ where: { id: appId }, data: { crmError: msg } }).catch(() => {});
  }
}

export async function notifyNewApplication(appId: string) {
  // Livespace w tle – po odpowiedzi dla klienta
  try {
    const { after } = await import("next/server");
    after(() => syncApplicationToCrm(appId));
  } catch {
    void syncApplicationToCrm(appId);
  }
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
