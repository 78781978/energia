"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/auth";
import { readAttribution } from "@/lib/attribution";
import { notifyTeam, sendMail } from "@/lib/mail";
import { saveUpload, UploadError } from "@/lib/storage";
import { isValidEmail, isValidNip, isValidPhone, normalizeDigits, str } from "@/lib/validators";
import type { FormState } from "@/lib/forms";
import { LEAD_TYPES } from "@/lib/constants";
import { SITE } from "@/lib/site";
import { getSiteSettings } from "@/lib/cms";
import { syncLeadToCrm as syncToCrm } from "@/lib/crm-sync";
import { signedFileUrl } from "@/lib/file-links";

export async function subscribeNewsletter(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd.get("email"), 200).toLowerCase();
  if (str(fd.get("website"))) return { ok: true, message: "Dziękujemy!" }; // pułapka na boty
  if (!isValidEmail(email)) return { error: "Wpisz poprawny adres e-mail.", values: { email } };
  if (!fd.get("consent")) return { error: "Zaznacz zgodę na otrzymywanie newslettera.", values: { email } };
  if (!await rateLimit(`nl:${await clientIp()}`, 10)) return { error: "Zbyt wiele prób. Spróbuj ponownie później." };
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (existing && !existing.unsubscribedAt) return { ok: true, message: "Ten adres jest już zapisany. Dziękujemy!" };
  if (existing) {
    await db.newsletterSubscriber.update({ where: { email }, data: { unsubscribedAt: null } });
  } else {
    await db.newsletterSubscriber.create({
      data: { email, source: str(fd.get("source"), 50) || null, unsubscribeToken: randomBytes(18).toString("base64url") },
    });
  }
  await sendMail({
    to: email,
    subject: "Potwierdzenie zapisu do newslettera",
    text: `Dziękujemy za zapis do newslettera ${SITE.brand}.\n\nBędziemy informować o zmianach na rynku energii ważnych dla firm. Z subskrypcji możesz zrezygnować w każdej chwili, odpowiadając na tę wiadomość lub klikając link rezygnacji w kolejnych wiadomościach.`,
  });
  return { ok: true, message: "Gotowe! Sprawdź skrzynkę – wysłaliśmy potwierdzenie." };
}

export async function submitLead(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = {
    type: str(fd.get("type"), 20),
    name: str(fd.get("name"), 120),
    company: str(fd.get("company"), 200),
    nip: str(fd.get("nip"), 20),
    email: str(fd.get("email"), 200).toLowerCase(),
    phone: str(fd.get("phone"), 30),
    topic: str(fd.get("topic"), 200),
    message: str(fd.get("message"), 4000),
    pagePath: str(fd.get("pagePath"), 300),
    option: str(fd.get("option"), 120),
  };
  if (str(fd.get("website"))) return { ok: true, message: "Dziękujemy!" };
  if (values.option) values.topic = [values.topic, values.option].filter(Boolean).join(" – ").slice(0, 200);
  const type = (Object.keys(LEAD_TYPES) as string[]).includes(values.type) ? values.type : "KONTAKT";
  const fe: Record<string, string> = {};
  if (values.name.length < 2) fe.name = "Podaj imię i nazwisko.";
  if (!isValidEmail(values.email)) fe.email = "Wpisz poprawny adres e-mail.";
  if (type === "ROZMOWA" && !isValidPhone(values.phone)) fe.phone = "Podaj numer telefonu, abyśmy mogli oddzwonić.";
  else if (values.phone && !isValidPhone(values.phone)) fe.phone = "Wpisz poprawny numer telefonu.";
  if (values.nip && !isValidNip(values.nip)) fe.nip = "Wpisz poprawny NIP (10 cyfr).";
  if (!fd.get("consent")) fe.consent = "Zgoda jest wymagana, abyśmy mogli odpowiedzieć na zapytanie.";
  const file = fd.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (type === "ANALIZA" && !hasFile && !values.message) fe.file = "Dołącz fakturę lub opisz, czego dotyczy analiza.";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe, values };
  if (!await rateLimit(`lead:${await clientIp()}`, 6, 30 * 60 * 1000)) return { error: "Wysłano już kilka zapytań. Spróbuj ponownie za kilkanaście minut.", values };

  let documentId: string | null = null;
  if (hasFile) {
    try {
      const stored = await saveUpload(file as File);
      const doc = await db.document.create({ data: { ...stored, kind: "FAKTURA", visibleToClient: false } });
      documentId = doc.id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { file: e.message }, values };
      throw e;
    }
  }

  const lead = await db.lead.create({
    data: {
      type,
      name: values.name,
      company: values.company || null,
      nip: values.nip ? normalizeDigits(values.nip) : null,
      email: values.email,
      phone: values.phone || null,
      topic: values.topic || null,
      message: values.message || null,
      pagePath: values.pagePath || null,
      source: await readAttribution(),
      documentId,
      marketingConsent: Boolean(fd.get("marketing")),
    },
  });

  await notifyTeam(
    `Nowe zapytanie: ${LEAD_TYPES[type as keyof typeof LEAD_TYPES]} – ${values.company || values.name}`,
    `Typ: ${LEAD_TYPES[type as keyof typeof LEAD_TYPES]}\nTemat: ${values.topic || "-"}\nImię i nazwisko: ${values.name}\nFirma: ${values.company || "-"}\nNIP: ${values.nip || "-"}\nE-mail: ${values.email}\nTelefon: ${values.phone || "-"}\nZałącznik: ${documentId ? "tak" : "nie"}\n\n${values.message || ""}\n\nPanel: ${SITE.url}/admin/zapytania/${lead.id}/`,
  );
  syncToCrm(lead.id, {
    kind: type,
    kindLabel: LEAD_TYPES[type as keyof typeof LEAD_TYPES],
    name: values.name,
    company: values.company || null,
    nip: values.nip ? normalizeDigits(values.nip) : null,
    email: values.email,
    phone: values.phone || null,
    topic: values.topic || null,
    message: values.message || null,
    page: values.pagePath || null,
    adminUrl: `${SITE.url}/admin/zapytania/${lead.id}/`,
    files: documentId ? [signedFileUrl(documentId)].filter((u): u is string => !!u).map((url) => ({ name: (file as File).name, url })) : [],
  });
  await sendMail({
    to: values.email,
    subject: "Otrzymaliśmy Twoje zapytanie",
    text: `Dzień dobry,\n\ndziękujemy za kontakt z ${SITE.brand}. Doradca odpowie w ciągu jednego dnia roboczego${type === "ROZMOWA" ? " i oddzwoni na podany numer" : ""}.\n\nTemat: ${values.topic || LEAD_TYPES[type as keyof typeof LEAD_TYPES]}`,
  });
  return { ok: true, message: "Dziękujemy! Doradca skontaktuje się z Tobą w ciągu jednego dnia roboczego." };
}

/**
 * „Zamów telefon – oddzwonimy w 60 sekund”: sam numer telefonu, natychmiastowe powiadomienie zespołu
 * i – jeśli ustawiono CALLBACK_WEBHOOK_URL – przekazanie zgłoszenia do systemu call center (JSON, POST).
 */
export async function requestCallback(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { phone: str(fd.get("phone"), 30), name: str(fd.get("name"), 120), topic: str(fd.get("topic"), 200), pagePath: str(fd.get("pagePath"), 300) };
  if (str(fd.get("website"))) return { ok: true, message: "Dziękujemy!" };
  const fe: Record<string, string> = {};
  if (!isValidPhone(values.phone)) fe.phone = "Wpisz numer telefonu (9 cyfr).";
  if (!fd.get("consent")) fe.consent = "Zgoda jest wymagana, abyśmy mogli zadzwonić.";
  if (Object.keys(fe).length) return { error: Object.values(fe)[0], fieldErrors: fe, values };
  if (!await rateLimit(`callback:${await clientIp()}`, 3, 30 * 60 * 1000)) return { error: "Zgłoszenie już do nas dotarło. Jeśli nikt nie zadzwonił, spróbuj ponownie za kilkanaście minut.", values };

  const phone = values.phone.replace(/[^\d+]/g, "");
  const lead = await db.lead.create({
    data: {
      type: "TELEFON",
      name: values.name || "Prośba o telefon",
      email: "",
      phone,
      topic: values.topic || "Zamów telefon – oddzwonienie w 60 sekund",
      pagePath: values.pagePath || null,
      source: await readAttribution(),
    },
  });
  await notifyTeam(
    `PILNE: oddzwoń teraz – ${phone}`,
    `Klient prosi o telefon w ciągu 60 sekund.\n\nTelefon: ${phone}\nImię: ${values.name || "-"}\nTemat: ${values.topic || "-"}\nStrona: ${values.pagePath || "-"}\n\nPanel: ${SITE.url}/admin/zapytania/${lead.id}/`,
  );
  syncToCrm(lead.id, {
    kind: "TELEFON",
    kindLabel: LEAD_TYPES.TELEFON,
    name: values.name || null,
    phone,
    topic: values.topic || null,
    page: values.pagePath || null,
    adminUrl: `${SITE.url}/admin/zapytania/${lead.id}/`,
  });
  const hook = process.env.CALLBACK_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.CALLBACK_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.CALLBACK_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify({ type: "callback", id: lead.id, phone, name: values.name || null, topic: values.topic || null, page: values.pagePath || null, createdAt: lead.createdAt.toISOString() }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (e) {
      console.error("[callback] webhook call center nie odpowiedział", e);
    }
  }
  const st = await getSiteSettings();
  return {
    ok: true,
    message: `Dziękujemy! Doradca zaraz oddzwoni na numer ${values.phone}.${st.openingHours ? ` Poza godzinami pracy biura (${st.openingHours}) zadzwonimy na początku kolejnego dnia roboczego.` : ""}`,
  };
}

/** Zdarzenia lejka formularza wniosku (bez danych osobowych). */
export async function trackFunnel(visitorId: string, step: number): Promise<void> {
  if (!/^[a-z0-9-]{8,64}$/i.test(visitorId) || !Number.isInteger(step) || step < 1 || step > 20) return;
  if (!await rateLimit(`funnel:${visitorId}`, 60, 60 * 60 * 1000)) return;
  await db.funnelEvent.create({ data: { visitorId, funnel: "wniosek", step, source: await readAttribution() } });
}
