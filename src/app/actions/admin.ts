"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { audit, diff, setStatus } from "@/lib/applications";
import { sendMail } from "@/lib/mail";
import { saveUpload, UploadError, type StoredFile } from "@/lib/storage";
import { APP_STATUSES, DOC_KINDS, LEAD_STATUSES, MEDIA, PRICE_MODELS, type AppStatus, type DocKind } from "@/lib/constants";
import {
  isPlausiblePpe,
  isValidEmail,
  isValidNip,
  isValidPhone,
  isValidPostalCode,
  isValidRegon,
  normalizeDigits,
  parseNumber,
  passwordProblem,
  str,
} from "@/lib/validators";
import type { FormState } from "@/lib/forms";
import { SITE } from "@/lib/site";

const appPath = (id: string) => `/admin/wnioski/${id}/`;

export async function changeStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const to = str(fd.get("status"), 40) as AppStatus;
  if (!APP_STATUSES.includes(to)) return { error: "Wybierz status." };
  await setStatus({ applicationId: id, to, actorId: admin.id, comment: str(fd.get("comment"), 1000) || null, notify: fd.get("notify") === "on" });
  revalidatePath(appPath(id));
  return { ok: true, message: "Status został zmieniony." };
}

export async function addNote(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const body = str(fd.get("body"), 5000);
  if (!body) return { error: "Wpisz treść notatki." };
  await db.note.create({ data: { applicationId: id, authorId: admin.id, body } });
  revalidatePath(appPath(id));
  return { ok: true, message: "Notatka dodana." };
}

export async function sendClientMessage(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const body = str(fd.get("body"), 5000);
  if (!body) return { error: "Wpisz treść komunikatu." };
  const app = await db.application.findUniqueOrThrow({ where: { id }, include: { user: true } });
  await db.message.create({ data: { recipientId: app.userId, authorId: admin.id, applicationId: id, body } });
  if (fd.get("email") === "on") {
    await sendMail({
      to: app.user.email,
      subject: `Nowa wiadomość dot. wniosku ${app.number}`,
      text: `Dzień dobry,\n\nw portalu ${SITE.portalBrand} czeka nowa wiadomość od doradcy:\n\n„${body}”\n\n${SITE.url}/portal/wnioski/${id}/`,
    });
  }
  await audit(admin.id, "Application", id, "message");
  revalidatePath(appPath(id));
  return { ok: true, message: "Komunikat wysłany do klienta." };
}

export async function adminUploadDocument(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const kind = str(fd.get("kind"), 30) as DocKind;
  if (!(kind in DOC_KINDS)) return { error: "Wybierz rodzaj dokumentu." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik." };
  const app = await db.application.findUniqueOrThrow({ where: { id } });
  let stored: StoredFile;
  try {
    stored = await saveUpload(file);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }
  const visible = fd.get("visibleToClient") === "on";
  await db.document.create({ data: { ...stored, kind, applicationId: id, companyId: app.companyId, uploadedById: admin.id, visibleToClient: visible } });
  await audit(admin.id, "Application", id, "document", { [kind]: [null, stored.fileName] });
  if (kind === "UMOWA" && fd.get("setWaiting") === "on") {
    await setStatus({ applicationId: id, to: "OCZEKUJE_NA_PODPIS", actorId: admin.id, comment: "Umowa udostępniona do podpisu" });
  }
  revalidatePath(appPath(id));
  return { ok: true, message: "Dokument dodany." };
}

export async function toggleDocumentVisibility(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("documentId"), 40);
  const doc = await db.document.findUniqueOrThrow({ where: { id } });
  await db.document.update({ where: { id }, data: { visibleToClient: !doc.visibleToClient } });
  await audit(admin.id, "Document", id, "visibility", { visibleToClient: [doc.visibleToClient, !doc.visibleToClient] });
  if (doc.applicationId) revalidatePath(appPath(doc.applicationId));
}

export async function updateApplicationParams(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const app = await db.application.findUniqueOrThrow({ where: { id } });
  const media = str(fd.get("media"), 10);
  const models = fd.getAll("priceModels").map(String).filter((m) => m in PRICE_MODELS);
  const years = str(fd.get("years"), 60).replace(/[^\d,]/g, "");
  if (!(media in MEDIA) || !models.length || !years) return { error: "Uzupełnij media, co najmniej jeden wariant i lata (np. 2027,2028)." };
  const data = {
    media,
    priceModel: models[0],
    priceModels: models.join(","),
    years,
    tariff: str(fd.get("tariff"), 30) || null,
    annualUsageMWh: parseNumber(fd.get("annualUsageMWh")),
    tariffGas: str(fd.get("tariffGas"), 30) || null,
    annualUsageGasMWh: parseNumber(fd.get("annualUsageGasMWh")),
    wantsCall: fd.get("wantsCall") === "on",
  };
  await db.application.update({ where: { id }, data });
  await audit(admin.id, "Application", id, "update", diff(app as unknown as Record<string, unknown>, data));
  revalidatePath(appPath(id));
  return { ok: true, message: "Zapisano parametry wniosku." };
}

export async function adminUpdateCompany(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("companyId"), 40);
  const company = await db.company.findUniqueOrThrow({ where: { id }, include: { points: true } });
  const fe: Record<string, string> = {};
  const data = {
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
  // Administrator może zapisać dane niepełne, ale nie błędne formalnie
  if (data.name.length < 2) fe.companyName = "Podaj nazwę firmy.";
  if (!isValidNip(data.nip)) fe.nip = "Wpisz poprawny NIP.";
  if (data.regon && !isValidRegon(data.regon)) fe.regon = "Niepoprawny REGON.";
  if (data.contactPhone && !isValidPhone(data.contactPhone)) fe.contactPhone = "Niepoprawny telefon.";
  if (data.contactEmail && !isValidEmail(data.contactEmail)) fe.contactEmail = "Niepoprawny e-mail.";
  if (data.hqPostalCode && !isValidPostalCode(data.hqPostalCode)) fe.hqPostalCode = "Format: 00-000.";
  let points: Record<string, unknown>[] = [];
  try {
    points = JSON.parse(str(fd.get("points"), 50000) || "[]");
  } catch {}
  points.forEach((p, i) => {
    const ppe = typeof p.ppeNumber === "string" ? p.ppeNumber.replace(/\s/g, "") : "";
    if (ppe && !isPlausiblePpe(ppe)) fe[`point_${i}_ppeNumber`] = "Niepoprawny numer PPE.";
  });
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };
  const changes = diff(company as unknown as Record<string, unknown>, data);
  await db.$transaction(async (tx) => {
    await tx.company.update({ where: { id }, data });
    for (const p of points.slice(0, 50)) {
      const s = (k: string, max = 200) => (typeof p[k] === "string" ? (p[k] as string).trim().slice(0, max) : "") || null;
      const n = (k: string) => parseNumber(p[k] != null ? String(p[k]) : null);
      const end = s("contractEndDate", 10);
      const pdata = {
        medium: p.medium === "GAZ" ? "GAZ" : "PRAD",
        ppeNumber: s("ppeNumber", 60)?.replace(/\s/g, "") ?? null,
        street: s("street"),
        postalCode: s("postalCode", 6),
        city: s("city", 100),
        currentSeller: s("currentSeller", 120),
        operator: s("operator", 120),
        tariff: s("tariff", 30),
        annualUsageMWh: n("annualUsageMWh"),
        contractedPowerKw: n("contractedPowerKw"),
        contractEndDate: end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? new Date(end) : null,
      };
      const pid = s("id", 40);
      if (pid && company.points.some((x) => x.id === pid)) {
        const before = company.points.find((x) => x.id === pid)!;
        const pd = diff(before as unknown as Record<string, unknown>, pdata);
        if (Object.keys(pd).length) {
          await tx.meteringPoint.update({ where: { id: pid }, data: pdata });
          for (const [k, v] of Object.entries(pd)) changes[`PPE ${pdata.ppeNumber ?? pid}: ${k}`] = v;
        }
      } else {
        await tx.meteringPoint.create({ data: { ...pdata, companyId: id } });
        changes[`PPE dodany`] = [null, pdata.ppeNumber];
      }
    }
  });
  await audit(admin.id, "Company", id, "update", changes);
  revalidatePath("/admin/", "layout");
  return { ok: true, message: Object.keys(changes).length ? "Zapisano zmiany (zapisane w logu zmian)." : "Brak zmian do zapisania." };
}

/** Dołącza punkty poboru firmy do wniosku (np. po uzupełnieniu danych z faktury). */
export async function linkPointsToApplication(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("applicationId"), 40);
  const app = await db.application.findUniqueOrThrow({ where: { id }, include: { company: { include: { points: true } }, points: true } });
  const linked = new Set(app.points.map((p) => p.pointId));
  const toLink = app.company.points.filter((p) => !linked.has(p.id));
  if (toLink.length) {
    await db.applicationPoint.createMany({ data: toLink.map((p) => ({ applicationId: id, pointId: p.id })) });
    await audit(admin.id, "Application", id, "points_linked", { punkty: [linked.size, linked.size + toLink.length] });
  }
  revalidatePath(appPath(id));
}

/* ------------------------------------------------------------ oferty */

export async function saveOffer(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("offerId"), 40);
  const data = {
    name: str(fd.get("name"), 200),
    supplier: str(fd.get("supplier"), 200),
    media: str(fd.get("media"), 10),
    priceModel: str(fd.get("priceModel"), 20),
    years: str(fd.get("years"), 60).replace(/[^\d,]/g, ""),
    priceNetMWh: parseNumber(fd.get("priceNetMWh")),
    tradeFeeMonthly: parseNumber(fd.get("tradeFeeMonthly")),
    validUntil: str(fd.get("validUntil"), 10) ? new Date(str(fd.get("validUntil"), 10)) : null,
    description: str(fd.get("description"), 3000) || null,
    isActive: fd.get("isActive") === "on",
  };
  const fe: Record<string, string> = {};
  if (!data.name) fe.name = "Podaj nazwę oferty.";
  if (!data.supplier) fe.supplier = "Podaj sprzedawcę.";
  if (!(data.media in MEDIA)) fe.media = "Wybierz media.";
  if (!(data.priceModel in PRICE_MODELS)) fe.priceModel = "Wybierz model ceny.";
  if (!data.years) fe.years = "Podaj lata, np. 2027,2028.";
  if (Object.keys(fe).length) return { error: "Uzupełnij wymagane pola.", fieldErrors: fe };

  let documentId: string | undefined;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const stored = await saveUpload(file, { pdfOnly: true });
      // cennik sprzedawcy jest dokumentem wewnętrznym – klient widzi tylko warunki oferty, nie plik cennika
      const doc = await db.document.create({ data: { ...stored, kind: "CENNIK", uploadedById: admin.id, visibleToClient: false } });
      documentId = doc.id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { file: e.message } };
      throw e;
    }
  }
  if (id) {
    const before = await db.offer.findUniqueOrThrow({ where: { id } });
    await db.offer.update({ where: { id }, data: { ...data, ...(documentId ? { documentId } : {}) } });
    await audit(admin.id, "Offer", id, "update", diff(before as unknown as Record<string, unknown>, data));
  } else {
    const o = await db.offer.create({ data: { ...data, documentId } });
    await audit(admin.id, "Offer", o.id, "create");
  }
  revalidatePath("/admin/oferty/");
  if (!id) redirect("/admin/oferty/?zapisano=1");
  return { ok: true, message: "Zapisano ofertę." };
}

export async function assignOffer(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const applicationId = str(fd.get("applicationId"), 40);
  const offerId = str(fd.get("offerId"), 40);
  if (!offerId) return { error: "Wybierz ofertę." };
  const exists = await db.offerAssignment.findUnique({ where: { offerId_applicationId: { offerId, applicationId } } });
  if (exists) return { error: "Ta oferta jest już przypisana do wniosku." };
  const offer = await db.offer.findUniqueOrThrow({ where: { id: offerId } });
  await db.offerAssignment.create({
    data: { offerId, applicationId, customPriceNetMWh: parseNumber(fd.get("customPriceNetMWh")), note: str(fd.get("note"), 1000) || null },
  });
  await audit(admin.id, "Application", applicationId, "offer_assigned", { oferta: [null, `${offer.supplier} – ${offer.name}`] });
  if (fd.get("notify") === "on") {
    const app = await db.application.findUniqueOrThrow({ where: { id: applicationId }, include: { user: true } });
    await db.message.create({ data: { recipientId: app.userId, authorId: admin.id, applicationId, body: "Przygotowaliśmy oferty dla Twojej firmy. Porównaj je i wybierz najlepszą w szczegółach wniosku." } });
    await sendMail({
      to: app.user.email,
      subject: `Oferty dla wniosku ${app.number} są gotowe`,
      text: `Dzień dobry,\n\nprzygotowaliśmy oferty dla Twojej firmy. Porównaj je i wybierz najlepszą:\n${SITE.url}/portal/wnioski/${applicationId}/`,
    });
  }
  revalidatePath(appPath(applicationId));
  return { ok: true, message: "Oferta przypisana do wniosku." };
}

/** Korekta propozycji (cena, uwaga) – dla ofert z generatora tylko w ciągu 24 godzin od przygotowania. */
export async function editOfferAssignment(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("assignmentId"), 40);
  const asg = await db.offerAssignment.findUnique({ where: { id }, include: { offer: true } });
  if (!asg) return { error: "Nie znaleziono propozycji." };
  if (asg.status !== "PROPONOWANA") return { error: "Klient już zdecydował – propozycji nie można zmienić." };
  if (asg.editableUntil && asg.editableUntil < new Date()) return { error: "Minęło 24 godziny – propozycję można tylko usunąć i przypisać nową." };
  const data = {
    customPriceNetMWh: parseNumber(fd.get("customPriceNetMWh")),
    note: str(fd.get("note"), 1000) || null,
    ...(fd.get("approve") === "on" ? { editableUntil: new Date() } : {}),
  };
  await db.offerAssignment.update({ where: { id }, data });
  await audit(admin.id, "Application", asg.applicationId, "offer_edited", diff({ customPriceNetMWh: asg.customPriceNetMWh, note: asg.note } as Record<string, unknown>, { customPriceNetMWh: data.customPriceNetMWh, note: data.note }));
  revalidatePath(appPath(asg.applicationId));
  revalidatePath(`/portal/wnioski/${asg.applicationId}/`);
  return { ok: true, message: fd.get("approve") === "on" ? "Zapisano i zatwierdzono propozycję." : "Zapisano zmiany propozycji." };
}

const PRIORITIES = ["WYSOKI", "SREDNI", "NISKI"];

/** Dane licznika uzupełniane przez doradcę: nowa umowa, oszczędności, priorytet. */
export async function updatePointAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("pointId"), 40);
  const point = await db.meteringPoint.findUnique({ where: { id } });
  if (!point) return { error: "Nie znaleziono licznika." };
  const date = (k: string) => {
    const v = str(fd.get(k), 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : null;
  };
  const priority = str(fd.get("priority"), 10);
  const notice = parseNumber(fd.get("noticeDays"));
  const data = {
    newContractStart: date("newContractStart"),
    newContractEnd: date("newContractEnd"),
    contractEndDate: date("contractEndDate"),
    noticeDays: notice != null && notice >= 0 && notice <= 730 ? Math.round(notice) : null,
    savingsPln: parseNumber(fd.get("savingsPln")),
    priority: PRIORITIES.includes(priority) ? priority : null,
  };
  await db.meteringPoint.update({ where: { id }, data });
  await audit(admin.id, "MeteringPoint", id, "update", diff(point as unknown as Record<string, unknown>, data));
  const appId = str(fd.get("applicationId"), 40);
  if (appId) revalidatePath(appPath(appId));
  revalidatePath("/portal/liczniki/");
  return { ok: true, message: "Zapisano." };
}

export async function removeOfferAssignment(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("assignmentId"), 40);
  const a = await db.offerAssignment.delete({ where: { id } });
  await audit(admin.id, "Application", a.applicationId, "offer_removed");
  revalidatePath(appPath(a.applicationId));
}

/* ------------------------------------------------------------ zapytania i zespół */

export async function setLeadStatus(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("leadId"), 40);
  const status = str(fd.get("status"), 20);
  if (!(status in LEAD_STATUSES)) return;
  const before = await db.lead.findUniqueOrThrow({ where: { id } });
  await db.lead.update({ where: { id }, data: { status } });
  await audit(admin.id, "Lead", id, "status", { status: [before.status, status] });
  revalidatePath("/admin/zapytania/", "layout");
}

export async function createAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const email = str(fd.get("email"), 200).toLowerCase();
  const name = str(fd.get("name"), 120) || null;
  const password = String(fd.get("password") ?? "");
  if (!isValidEmail(email)) return { error: "Wpisz poprawny e-mail." };
  const pp = passwordProblem(password);
  if (pp) return { error: pp };
  if (await db.user.findUnique({ where: { email } })) return { error: "Użytkownik z tym adresem już istnieje." };
  const u = await db.user.create({ data: { email, name, role: "ADMIN", passwordHash: await hashPassword(password) } });
  await audit(admin.id, "User", u.id, "create_admin");
  revalidatePath("/admin/zespol/");
  return { ok: true, message: `Dodano administratora ${email}.` };
}

export async function toggleUserActive(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("userId"), 40);
  if (id === admin.id) return;
  const u = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { isActive: !u.isActive } });
  if (u.isActive) await db.session.deleteMany({ where: { userId: id } });
  await audit(admin.id, "User", id, "active", { isActive: [u.isActive, !u.isActive] });
  revalidatePath("/admin/", "layout");
}
