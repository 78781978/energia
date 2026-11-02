"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { readAttribution } from "@/lib/attribution";
import { audit, diff, nextApplicationNumber, notifyNewApplication, setStatus } from "@/lib/applications";
import { notifyTeam } from "@/lib/mail";
import { saveUpload, UploadError, removeStored, type StoredFile } from "@/lib/storage";
import { MEDIA, PRICE_MODELS, type DocKind } from "@/lib/constants";
import {
  isPlausiblePpe,
  isValidEmail,
  isValidNip,
  isValidPhone,
  isValidPostalCode,
  isValidRegon,
  normalizeDigits,
  parseNumber,
  str,
} from "@/lib/validators";
import type { FormState } from "@/lib/forms";
import { SITE } from "@/lib/site";

/* ------------------------------------------------------------ dane firmy */

type CompanyInput = {
  name: string;
  nip: string;
  regon: string | null;
  legalForm: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  hqStreet: string | null;
  hqPostalCode: string | null;
  hqCity: string | null;
  corrSameAsHq: boolean;
  corrStreet: string | null;
  corrPostalCode: string | null;
  corrCity: string | null;
};

function readCompany(fd: FormData, fe: Record<string, string>): CompanyInput {
  const c: CompanyInput = {
    name: str(fd.get("companyName"), 250),
    nip: normalizeDigits(str(fd.get("nip"), 20)),
    regon: normalizeDigits(str(fd.get("regon"), 20)) || null,
    legalForm: str(fd.get("legalForm"), 80) || null,
    contactName: str(fd.get("contactName"), 120) || null,
    contactPhone: str(fd.get("contactPhone"), 30) || null,
    contactEmail: str(fd.get("contactEmail"), 200).toLowerCase() || null,
    hqStreet: str(fd.get("hqStreet"), 200) || null,
    hqPostalCode: str(fd.get("hqPostalCode"), 6) || null,
    hqCity: str(fd.get("hqCity"), 100) || null,
    corrSameAsHq: fd.get("corrDifferent") !== "on",
    corrStreet: str(fd.get("corrStreet"), 200) || null,
    corrPostalCode: str(fd.get("corrPostalCode"), 6) || null,
    corrCity: str(fd.get("corrCity"), 100) || null,
  };
  if (c.name.length < 2) fe.companyName = "Podaj nazwę firmy.";
  if (!isValidNip(c.nip)) fe.nip = "Wpisz poprawny NIP (10 cyfr).";
  if (c.regon && !isValidRegon(c.regon)) fe.regon = "Wpisz poprawny REGON (9 lub 14 cyfr).";
  if (!c.contactName) fe.contactName = "Podaj imię i nazwisko osoby kontaktowej.";
  if (!c.contactPhone || !isValidPhone(c.contactPhone)) fe.contactPhone = "Wpisz poprawny numer telefonu.";
  if (!c.contactEmail || !isValidEmail(c.contactEmail)) fe.contactEmail = "Wpisz poprawny adres e-mail.";
  if (!c.hqStreet) fe.hqStreet = "Podaj ulicę i numer.";
  if (!c.hqPostalCode || !isValidPostalCode(c.hqPostalCode)) fe.hqPostalCode = "Format: 00-000.";
  if (!c.hqCity) fe.hqCity = "Podaj miejscowość.";
  if (!c.corrSameAsHq) {
    if (!c.corrStreet) fe.corrStreet = "Podaj adres korespondencyjny.";
    if (!c.corrPostalCode || !isValidPostalCode(c.corrPostalCode)) fe.corrPostalCode = "Format: 00-000.";
    if (!c.corrCity) fe.corrCity = "Podaj miejscowość.";
  } else {
    c.corrStreet = c.corrPostalCode = c.corrCity = null;
  }
  return c;
}

type PointInput = {
  id?: string;
  medium: "PRAD" | "GAZ";
  ppeNumber: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  currentSeller: string | null;
  operator: string | null;
  tariff: string | null;
  annualUsageMWh: number | null;
  contractedPowerKw: number | null;
  contractEndDate: Date | null;
};

function readPoints(raw: string, fe: Record<string, string>): PointInput[] {
  let arr: unknown;
  try {
    arr = JSON.parse(raw || "[]");
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 50).map((p: Record<string, unknown>, i: number) => {
    const s = (k: string, max = 200) => (typeof p[k] === "string" ? (p[k] as string).trim().slice(0, max) : "") || null;
    const n = (k: string) => {
      const v = parseNumber(typeof p[k] === "string" || typeof p[k] === "number" ? String(p[k]) : null);
      return v != null && v >= 0 && v < 1e7 ? v : null;
    };
    const ppe = s("ppeNumber", 60)?.replace(/\s/g, "") ?? null;
    if (ppe && !isPlausiblePpe(ppe)) fe[`point_${i}_ppeNumber`] = "Numer PPE wygląda na niepoprawny – sprawdź go na fakturze.";
    const postal = s("postalCode", 6);
    if (postal && !isValidPostalCode(postal)) fe[`point_${i}_postalCode`] = "Format: 00-000.";
    const end = s("contractEndDate", 10);
    const endDate = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? new Date(end) : null;
    return {
      id: s("id", 40) ?? undefined,
      medium: p.medium === "GAZ" ? "GAZ" : "PRAD",
      ppeNumber: ppe,
      street: s("street"),
      postalCode: postal,
      city: s("city", 100),
      currentSeller: s("currentSeller", 120),
      operator: s("operator", 120),
      tariff: s("tariff", 30),
      annualUsageMWh: n("annualUsageMWh"),
      contractedPowerKw: n("contractedPowerKw"),
      contractEndDate: endDate,
    } satisfies PointInput;
  });
}

/* ------------------------------------------------------------ wniosek */

export async function submitApplication(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const fe: Record<string, string> = {};

  const media = str(fd.get("media"), 10);
  if (!(media in MEDIA)) fe.media = "Wybierz media.";
  const years = fd
    .getAll("years")
    .map((y) => Number(y))
    .filter((y) => Number.isInteger(y) && y >= 2024 && y <= 2040);
  if (!years.length) fe.years = "Wybierz co najmniej jeden rok.";
  const priceModel = str(fd.get("priceModel"), 20);
  if (!(priceModel in PRICE_MODELS)) fe.priceModel = "Wybierz wariant zakupu.";
  const tariff = str(fd.get("tariff"), 30) || null;
  const usage = parseNumber(fd.get("annualUsageMWh"));
  const company = readCompany(fd, fe);
  const points = readPoints(str(fd.get("points"), 50000), fe);

  const invoices = fd.getAll("invoice").filter((f): f is File => f instanceof File && f.size > 0);
  const poa = fd.get("poa");
  const poaFile = poa instanceof File && poa.size > 0 ? poa : null;
  if (!invoices.length && !points.some((p) => p.ppeNumber)) fe.points = "Dodaj co najmniej jeden punkt poboru z numerem PPE albo prześlij fakturę.";
  if (invoices.length > 5) fe.invoice = "Możesz dodać maksymalnie 5 faktur naraz.";

  if (Object.keys(fe).length) return { error: "Uzupełnij brakujące lub niepoprawne dane.", fieldErrors: fe };

  // Pliki zapisujemy przed transakcją; w razie błędu sprzątamy.
  const stored: { file: StoredFile; kind: DocKind }[] = [];
  try {
    for (const f of invoices) stored.push({ file: await saveUpload(f), kind: "FAKTURA" });
    if (poaFile) stored.push({ file: await saveUpload(poaFile), kind: "PELNOMOCNICTWO" });
  } catch (e) {
    await Promise.all(stored.map((s) => removeStored(s.file.storedName)));
    if (e instanceof UploadError) return { error: e.message, fieldErrors: { invoice: e.message } };
    throw e;
  }

  const existingId = str(fd.get("companyId"), 40);
  const existing = existingId ? await db.company.findFirst({ where: { id: existingId, ownerId: user.id } }) : null;

  let appId = "";
  for (let attempt = 0; attempt < 3 && !appId; attempt++) {
    try {
      appId = await db.$transaction(async (tx) => {
        const comp = existing
          ? await tx.company.update({ where: { id: existing.id }, data: company })
          : await tx.company.create({ data: { ...company, ownerId: user.id } });
        const pointIds: string[] = [];
        for (const p of points) {
          const { id, ...data } = p;
          if (id) {
            const own = await tx.meteringPoint.findFirst({ where: { id, companyId: comp.id } });
            if (own) {
              await tx.meteringPoint.update({ where: { id }, data });
              pointIds.push(id);
              continue;
            }
          }
          const created = await tx.meteringPoint.create({ data: { ...data, companyId: comp.id } });
          pointIds.push(created.id);
        }
        const app = await tx.application.create({
          data: {
            number: await nextApplicationNumber(tx),
            userId: user.id,
            companyId: comp.id,
            media,
            years: years.sort().join(","),
            priceModel,
            tariff,
            annualUsageMWh: usage,
            clientComment: str(fd.get("comment"), 3000) || null,
            wantsCall: fd.get("wantsCall") === "on",
            source: await readAttribution(),
            points: { create: pointIds.map((pointId) => ({ pointId })) },
          },
        });
        await tx.statusChange.create({ data: { applicationId: app.id, toStatus: "WNIOSEK_UTWORZONY", changedById: user.id, comment: "Wniosek złożony przez klienta" } });
        for (const s of stored) {
          await tx.document.create({
            data: { ...s.file, kind: s.kind, applicationId: app.id, companyId: comp.id, uploadedById: user.id, visibleToClient: true },
          });
        }
        await tx.auditLog.create({ data: { actorId: user.id, entityType: "Application", entityId: app.id, action: "create" } });
        return app.id;
      });
    } catch (e) {
      // Kolizja numeru wniosku przy równoczesnym zapisie – ponów
      if (attempt === 2 || !(e instanceof Error && /Unique constraint/i.test(e.message))) {
        await Promise.all(stored.map((s) => removeStored(s.file.storedName)));
        throw e;
      }
    }
  }
  await notifyNewApplication(appId);
  redirect(`/portal/wnioski/${appId}/?nowy=1`);
}

/* ------------------------------------------------------------ dokumenty */

const CLIENT_KINDS: DocKind[] = ["FAKTURA", "PELNOMOCNICTWO", "UMOWA_PODPISANA", "INNE"];

export async function uploadClientDocument(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const appId = str(fd.get("applicationId"), 40);
  const kind = str(fd.get("kind"), 30) as DocKind;
  const app = await db.application.findFirst({ where: { id: appId, userId: user.id } });
  if (!app) return { error: "Nie znaleziono wniosku." };
  if (!CLIENT_KINDS.includes(kind)) return { error: "Wybierz rodzaj dokumentu." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik." };
  let stored: StoredFile;
  try {
    stored = await saveUpload(file, { pdfOnly: kind === "UMOWA_PODPISANA" });
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  await db.document.create({ data: { ...stored, kind, applicationId: app.id, companyId: app.companyId, uploadedById: user.id, visibleToClient: true } });
  await audit(user.id, "Application", app.id, "document", { [kind]: [null, stored.fileName] });

  if (kind === "UMOWA_PODPISANA" && app.status === "OCZEKUJE_NA_PODPIS") {
    await setStatus({ applicationId: app.id, to: "PODPISANA", actorId: user.id, comment: "Klient przesłał podpisaną umowę", notify: false });
    await notifyTeam(`Podpisana umowa – wniosek ${app.number}`, `Klient przesłał podpisaną umowę.\n${SITE.url}/admin/wnioski/${app.id}/`);
    revalidatePath(`/portal/wnioski/${app.id}/`);
    return { ok: true, message: "Dziękujemy! Podpisana umowa została przesłana. Status wniosku: Podpisana." };
  }
  await notifyTeam(`Nowy dokument od klienta – wniosek ${app.number}`, `Rodzaj: ${kind}\nPlik: ${stored.fileName}\n${SITE.url}/admin/wnioski/${app.id}/`);
  revalidatePath(`/portal/wnioski/${app.id}/`);
  return { ok: true, message: "Dokument został dodany. Możesz przejść do kolejnego kroku." };
}

/* ------------------------------------------------------------ oferty */

export async function chooseOffer(fd: FormData): Promise<void> {
  const user = await requireClient();
  const id = str(fd.get("assignmentId"), 40);
  const asg = await db.offerAssignment.findFirst({ where: { id, application: { userId: user.id } }, include: { application: true, offer: true } });
  if (!asg || asg.status !== "PROPONOWANA") return;
  await db.$transaction([
    db.offerAssignment.update({ where: { id }, data: { status: "WYBRANA", decidedAt: new Date() } }),
    db.offerAssignment.updateMany({
      where: { applicationId: asg.applicationId, id: { not: id }, status: "PROPONOWANA" },
      data: { status: "ODRZUCONA", decidedAt: new Date() },
    }),
  ]);
  await audit(user.id, "Application", asg.applicationId, "offer_chosen", { oferta: [null, `${asg.offer.supplier} – ${asg.offer.name}`] });
  await notifyTeam(
    `Klient wybrał ofertę – wniosek ${asg.application.number}`,
    `Wybrana oferta: ${asg.offer.supplier} – ${asg.offer.name}\nPrzygotuj umowę do podpisu.\n${SITE.url}/admin/wnioski/${asg.applicationId}/`,
  );
  revalidatePath(`/portal/wnioski/${asg.applicationId}/`);
}

export async function requestCall(fd: FormData): Promise<void> {
  const user = await requireClient();
  const appId = str(fd.get("applicationId"), 40);
  const app = await db.application.findFirst({ where: { id: appId, userId: user.id }, include: { company: true } });
  if (!app) return;
  await db.application.update({ where: { id: app.id }, data: { wantsCall: true } });
  await notifyTeam(`Prośba o kontakt – wniosek ${app.number}`, `Klient ${app.company.name} prosi o rozmowę z doradcą.\nTelefon: ${app.company.contactPhone ?? user.phone ?? "-"}\n${SITE.url}/admin/wnioski/${app.id}/`);
  revalidatePath(`/portal/wnioski/${app.id}/`);
}

export async function markMessagesRead(): Promise<void> {
  const user = await requireClient();
  await db.message.updateMany({ where: { recipientId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/portal/");
}

/* ------------------------------------------------------------ moje dane */

export async function updateMyCompany(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const id = str(fd.get("companyId"), 40);
  const company = await db.company.findFirst({ where: { id, ownerId: user.id }, include: { points: true } });
  if (!company) return { error: "Nie znaleziono firmy." };
  const fe: Record<string, string> = {};
  const data = readCompany(fd, fe);
  const points = readPoints(str(fd.get("points"), 50000), fe);
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };
  const changes = diff(company as unknown as Record<string, unknown>, data as unknown as Record<string, unknown>);
  await db.$transaction(async (tx) => {
    await tx.company.update({ where: { id }, data });
    for (const p of points) {
      const { id: pid, ...pdata } = p;
      if (pid && company.points.some((x) => x.id === pid)) await tx.meteringPoint.update({ where: { id: pid }, data: pdata });
      else await tx.meteringPoint.create({ data: { ...pdata, companyId: id } });
    }
  });
  await audit(user.id, "Company", id, "update", changes);
  revalidatePath("/portal/moje-dane/");
  return { ok: true, message: "Zapisano zmiany." };
}

export async function updateMyAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireClient();
  const name = str(fd.get("name"), 120) || null;
  const phone = str(fd.get("phone"), 30) || null;
  if (phone && !isValidPhone(phone)) return { error: "Wpisz poprawny numer telefonu.", fieldErrors: { phone: "Wpisz poprawny numer telefonu." } };
  const marketingConsent = fd.get("marketing") === "on";
  const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  await db.user.update({ where: { id: user.id }, data: { name, phone, marketingConsent } });
  await audit(user.id, "User", user.id, "update", diff(before as unknown as Record<string, unknown>, { name, phone, marketingConsent }));
  revalidatePath("/portal/moje-dane/");
  return { ok: true, message: "Zapisano dane konta." };
}
