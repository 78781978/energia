"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/applications";
import { parsePriceTable, syncMarketPrices } from "@/lib/prices";
import { ImportError, importPriceFile, sniffKind } from "@/lib/pricelist-import";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { saveUpload, UploadError } from "@/lib/storage";
import { str } from "@/lib/validators";
import type { FormState } from "@/lib/forms";

/** Ręczne pobranie cen rynkowych z PSE (poza codziennym pobieraniem automatycznym). */
export async function refreshMarketPrices(_prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await syncMarketPrices(30);
  revalidatePath("/admin/ceny/");
  if (r.errors.length && !r.saved) return { error: `Nie udało się pobrać cen z PSE. ${r.errors[0]}` };
  return { ok: true, message: r.saved ? `Pobrano ceny z ${r.saved} ${r.saved === 1 ? "doby" : "dób"}.` : "Ceny są aktualne – brak nowych danych." };
}

/**
 * Nowy cennik zastępuje poprzedni cennik tego samego sprzedawcy na te same media:
 * poprzedni (do odwołania albo nachodzący na nowy) kończy się dzień przed początkiem nowego.
 */
async function closePrevious(supplier: string, media: string | null, from: Date, exceptId: string) {
  const prev = await db.priceList.findMany({
    where: {
      id: { not: exceptId },
      supplier,
      ...(media ? { OR: [{ media }, { media: null }] } : {}),
      validFrom: { lt: from },
      AND: [{ OR: [{ validTo: null }, { validTo: { gte: from } }] }],
    },
    select: { id: true },
  });
  if (!prev.length) return 0;
  const end = new Date(from.getTime() - 86400e3);
  await db.priceList.updateMany({ where: { id: { in: prev.map((p) => p.id) } }, data: { validTo: end } });
  return prev.length;
}

/** Import cennika z pliku PDF lub Excel (Audax – gaz, Enefit – FIX prąd i gaz). */
export async function importPriceListFile(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik cennika (PDF albo Excel).", fieldErrors: { file: "Wybierz plik." } };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Plik jest większy niż 10 MB.", fieldErrors: { file: "Plik jest za duży." } };
  const buf = new Uint8Array(await file.arrayBuffer());
  const kind = sniffKind(buf);
  if (!kind) return { error: "To nie jest plik PDF ani Excel (.xlsx).", fieldErrors: { file: "Nieobsługiwany plik." } };

  let res;
  try {
    res = await importPriceFile(buf);
  } catch (e) {
    if (e instanceof ImportError) return { error: e.message, fieldErrors: { file: e.message } };
    console.error("[cenniki] import:", e);
    return { error: "Nie udało się odczytać cennika. Sprawdź plik albo wklej tabelę ręcznie.", fieldErrors: { file: "Błąd odczytu." } };
  }
  const overrideFrom = dateOrNull(str(fd.get("validFrom"), 10));
  const overrideTo = dateOrNull(str(fd.get("validTo"), 10));
  const validFrom = overrideFrom ?? res.validFrom;
  const validTo = overrideTo ?? res.validTo;
  if (!validFrom) return { error: "W pliku nie ma daty obowiązywania – podaj ją w polu „Obowiązuje od”.", fieldErrors: { validFrom: "Podaj datę." } };

  if (res.number) {
    const dup = await db.priceList.findFirst({ where: { supplier: res.supplier, number: res.number, media: res.media } });
    if (dup) return { error: `Ten cennik (${res.supplier}, nr ${res.number}) jest już dodany. Usuń poprzedni, jeśli chcesz zaimportować go ponownie.` };
  }

  // oryginał PDF zapisujemy jako dokument wewnętrzny (po kontroli bezpieczeństwa); Excel służy tylko do odczytu cen
  let documentId: string | null = null;
  if (kind === "pdf") {
    try {
      const stored = await saveUpload(new File([buf], file.name, { type: "application/pdf" }), { pdfOnly: true });
      const doc = await db.document.create({ data: { ...stored, kind: "CENNIK", uploadedById: admin.id, visibleToClient: false } });
      documentId = doc.id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { file: e.message } };
      throw e;
    }
  }

  const list = await db.priceList.create({
    data: {
      supplier: res.supplier,
      name: res.media === "GAZ" ? "Gaz" : res.media === "PRAD" ? "Energia elektryczna" : null,
      number: res.number,
      media: res.media,
      format: res.format,
      validFrom,
      validTo,
      note: res.warnings.length ? `Uwagi z importu:\n${res.warnings.join("\n")}` : null,
      conditions: res.conditions.join("\n").slice(0, 8000) || null,
      documentId,
      createdById: admin.id,
      items: { create: res.items },
    },
  });
  const closed = await closePrevious(res.supplier, res.media, validFrom, list.id);
  await audit(admin.id, "PriceList", list.id, "import", { supplier: [null, res.supplier], items: [null, res.items.length], file: [null, file.name] });
  revalidatePath("/admin/ceny/");
  redirect(`/admin/ceny/${list.id}/?zapisano=${res.items.length}&pominiete=${res.warnings.length}&zamkniete=${closed}`);
}

const dateOrNull = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : null);

/** Nowy cennik sprzedawcy: tabela wklejona z Excela + opcjonalnie oryginał w PDF (dokument wewnętrzny). */
export async function savePriceList(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const values = {
    supplier: str(fd.get("supplier"), 120),
    name: str(fd.get("name"), 160),
    validFrom: str(fd.get("validFrom"), 10),
    validTo: str(fd.get("validTo"), 10),
    note: str(fd.get("note"), 1000),
    table: str(fd.get("table"), 400_000),
  };
  const fe: Record<string, string> = {};
  if (!values.supplier) fe.supplier = "Podaj sprzedawcę.";
  const from = dateOrNull(values.validFrom);
  const to = values.validTo ? dateOrNull(values.validTo) : null;
  if (!from) fe.validFrom = "Podaj datę początku obowiązywania.";
  if (values.validTo && !to) fe.validTo = "Zła data.";
  if (from && to && to < from) fe.validTo = "Data końca jest wcześniejsza niż początek.";
  const { rows, errors } = parsePriceTable(values.table);
  if (!rows.length) fe.table = errors[0] ?? "Wklej tabelę z cenami.";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe, values };

  let documentId: string | null = null;
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const stored = await saveUpload(file, { pdfOnly: true });
      const doc = await db.document.create({ data: { ...stored, kind: "CENNIK", uploadedById: admin.id, visibleToClient: false } });
      documentId = doc.id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { file: e.message }, values };
      throw e;
    }
  }

  const list = await db.priceList.create({
    data: {
      supplier: values.supplier,
      name: values.name || null,
      format: "TABELA",
      media: new Set(rows.map((r) => r.media)).size === 1 ? rows[0].media : null,
      validFrom: from!,
      validTo: to,
      note: values.note || null,
      documentId,
      createdById: admin.id,
      items: { create: rows },
    },
  });
  const closed = to ? 0 : await closePrevious(values.supplier, list.media, from!, list.id);
  await audit(admin.id, "PriceList", list.id, "create", { supplier: [null, values.supplier], items: [null, rows.length] });
  revalidatePath("/admin/ceny/");
  redirect(`/admin/ceny/${list.id}/?zapisano=${rows.length}&pominiete=${errors.length}&zamkniete=${closed}`);
}

export async function deletePriceList(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("id"), 40);
  const list = await db.priceList.findUnique({ where: { id } });
  if (!list) redirect("/admin/ceny/");
  await db.priceList.delete({ where: { id } });
  await audit(admin.id, "PriceList", id, "delete", { supplier: [list.supplier, null] });
  revalidatePath("/admin/ceny/");
  redirect("/admin/ceny/?usunieto=1");
}
