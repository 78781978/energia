"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, createSession, getCurrentUser, hashPassword, rateLimit } from "@/lib/auth";
import { readAttribution } from "@/lib/attribution";
import { nextApplicationNumber, notifyNewApplication } from "@/lib/applications";
import { readCompany, readPoints } from "@/lib/company-input";
import { verifyHuman } from "@/lib/captcha";
import { autoMatchOffers } from "@/lib/offers";
import { sendVerification } from "@/lib/verify";
import { saveUpload, UploadError, removeStored, type StoredFile } from "@/lib/storage";
import { MEDIA, PRICE_MODELS, type Media, type PriceModel } from "@/lib/constants";
import { PRICE_OPTIONS } from "@/lib/wizard";
import { parseNumber, passwordProblem, str } from "@/lib/validators";
import type { FormState } from "@/lib/forms";

/**
 * Zapis kreatora „Zamów energię”: (opcjonalnie) rejestracja konta + firma + liczniki + faktury + wniosek,
 * a następnie automatyczny dobór ofert (generator).
 */
export async function submitWizard(_prev: FormState, fd: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (current?.role === "ADMIN") return { error: "Konto administratora nie składa wniosków. Zaloguj się jako klient." };
  const fe: Record<string, string> = {};
  const ip = await clientIp();

  // --- dane zakupu
  const media = str(fd.get("media"), 10) as Media;
  if (!(media in MEDIA)) fe.media = "Wybierz media.";
  const years = [...new Set(fd.getAll("years").map(Number))].filter((y) => Number.isInteger(y) && y >= 2024 && y <= 2040).sort();
  if (!years.length) fe.years = "Wybierz co najmniej jeden rok.";
  const allowed = media in MEDIA ? PRICE_OPTIONS[media] : [];
  const models = [...new Set(fd.getAll("priceModels").map(String))].filter((m): m is PriceModel => m in PRICE_MODELS && allowed.includes(m as PriceModel));
  if (!models.length) fe.priceModels = "Wybierz co najmniej jeden wariant zakupu.";
  const usageOf = (k: string) => {
    const v = parseNumber(fd.get(k));
    if (v != null && (v < 0 || v > 1e7)) fe[k] = "Wpisz liczbę, np. 120.";
    return v != null && v >= 0 && v <= 1e7 ? v : null;
  };
  const withPower = media !== "GAZ";
  const withGas = media !== "PRAD";
  const tariff = withPower ? str(fd.get("tariff"), 30) || null : null;
  const tariffGas = withGas ? str(fd.get("tariffGas"), 30) || null : null;
  const usage = withPower ? usageOf("annualUsageMWh") : null;
  const usageGas = withGas ? usageOf("annualUsageGasMWh") : null;

  // --- firma i liczniki
  const company = readCompany(fd, fe);
  const points = readPoints(str(fd.get("points"), 50000), fe).filter((p) => p.ppeNumber || p.meterNumber || p.street || p.name);

  const files = (k: string) => fd.getAll(k).filter((f): f is File => f instanceof File && f.size > 0);
  const invPower = withPower ? files("invoicePower") : [];
  const invGas = withGas ? files("invoiceGas") : [];
  if (invPower.length + invGas.length > 24) fe.invoicePower = "Możesz dodać maksymalnie 12 faktur dla każdego medium.";

  // --- konto (tylko dla nowych użytkowników)
  let password = "";
  if (!current) {
    password = String(fd.get("password") ?? "");
    const pp = passwordProblem(password);
    if (pp) fe.password = pp;
    if (password !== String(fd.get("password2") ?? "")) fe.password2 = "Hasła nie są takie same.";
    if (!fd.get("terms")) fe.terms = "Akceptacja regulaminu i polityki prywatności jest wymagana.";
  }

  if (Object.keys(fe).length) return { error: "Uzupełnij brakujące lub niepoprawne dane.", fieldErrors: fe };

  let userId = current?.id ?? "";
  let createdUser = false;
  if (!current) {
    const human = await verifyHuman(fd, ip, 8);
    if (human) return { error: human, fieldErrors: { captcha: human } };
    if (!await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) return { error: "Zbyt wiele prób rejestracji. Spróbuj ponownie później." };
    const email = company.contactEmail!;
    const exists = await db.user.findUnique({ where: { email } });
    if (exists)
      return {
        error: "Konto z tym adresem e-mail już istnieje. Zaloguj się – dane z kreatora wypełnisz ponownie po zalogowaniu.",
        fieldErrors: { contactEmail: "Ten adres jest już zarejestrowany.", login: "1" },
      };
    const now = new Date();
    const newsletter = fd.get("newsletter") === "on";
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        name: company.contactName,
        phone: company.contactPhone,
        marketingConsent: fd.get("marketingEmail") === "on",
        smsConsent: fd.get("sms") === "on",
        newsletterConsent: newsletter,
        consentsUpdatedAt: now,
        source: await readAttribution(),
      },
    });
    if (newsletter)
      await db.newsletterSubscriber.upsert({
        where: { email },
        update: { unsubscribedAt: null },
        create: { email, source: "rejestracja", unsubscribeToken: randomBytes(24).toString("base64url") },
      });
    await db.auditLog.create({
      data: { actorId: user.id, entityType: "User", entityId: user.id, action: "consents", changes: JSON.stringify({ terms: [null, true], marketingEmail: [null, user.marketingConsent], sms: [null, user.smsConsent], newsletter: [null, newsletter], ip: [null, ip] }) },
    });
    userId = user.id;
    createdUser = true;
  }

  // --- pliki
  const stored: { file: StoredFile; medium: "PRAD" | "GAZ" }[] = [];
  try {
    for (const f of invPower) stored.push({ file: await saveUpload(f, { allowXml: true }), medium: "PRAD" });
    for (const f of invGas) stored.push({ file: await saveUpload(f, { allowXml: true }), medium: "GAZ" });
  } catch (e) {
    await Promise.all(stored.map((s) => removeStored(s.file.storedName)));
    if (createdUser) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    if (e instanceof UploadError) return { error: e.message, fieldErrors: { invoicePower: e.message } };
    throw e;
  }

  const existingId = str(fd.get("companyId"), 40);
  const existing = existingId && current ? await db.company.findFirst({ where: { id: existingId, ownerId: userId } }) : null;

  let appId = "";
  try {
    for (let attempt = 0; attempt < 3 && !appId; attempt++) {
      try {
        appId = await db.$transaction(async (tx) => {
          const comp = existing
            ? await tx.company.update({ where: { id: existing.id }, data: company })
            : await tx.company.create({ data: { ...company, ownerId: userId } });
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
            pointIds.push((await tx.meteringPoint.create({ data: { ...data, companyId: comp.id } })).id);
          }
          const app = await tx.application.create({
            data: {
              number: await nextApplicationNumber(tx),
              userId,
              companyId: comp.id,
              media,
              years: years.join(","),
              priceModel: models[0],
              priceModels: models.join(","),
              tariff,
              annualUsageMWh: usage,
              tariffGas,
              annualUsageGasMWh: usageGas,
              clientComment: str(fd.get("comment"), 3000) || null,
              wantsCall: fd.get("wantsCall") === "on",
              source: await readAttribution(),
              points: { create: pointIds.map((pointId) => ({ pointId })) },
            },
          });
          await tx.statusChange.create({ data: { applicationId: app.id, toStatus: "WNIOSEK_UTWORZONY", changedById: userId, comment: "Wniosek złożony w kreatorze" } });
          for (const s of stored) {
            const prefix = s.medium === "GAZ" ? "Gaz – " : "Prąd – ";
            await tx.document.create({
              data: { ...s.file, fileName: (prefix + s.file.fileName).slice(0, 140), kind: "FAKTURA", applicationId: app.id, companyId: comp.id, uploadedById: userId, visibleToClient: true },
            });
          }
          await tx.auditLog.create({ data: { actorId: userId, entityType: "Application", entityId: app.id, action: "create" } });
          return app.id;
        });
      } catch (e) {
        if (attempt === 2 || !(e instanceof Error && /Unique constraint/i.test(e.message))) throw e;
      }
    }
  } catch (e) {
    await Promise.all(stored.map((s) => removeStored(s.file.storedName)));
    if (createdUser) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    throw e;
  }

  await autoMatchOffers(appId).catch((e) => console.error("[generator ofert]", e));
  await notifyNewApplication(appId);
  if (createdUser) {
    await sendVerification(userId, company.contactEmail!);
    await createSession(userId, true);
  }
  redirect(`/portal/wnioski/${appId}/?generuj=1${createdUser ? "&nowe=1" : ""}`);
}
