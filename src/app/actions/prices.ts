"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/applications";
import { parsePriceTable, syncMarketPrices } from "@/lib/prices";
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
      validFrom: from!,
      validTo: to,
      note: values.note || null,
      documentId,
      createdById: admin.id,
      items: { create: rows },
    },
  });
  await audit(admin.id, "PriceList", list.id, "create", { supplier: [null, values.supplier], items: [null, rows.length] });
  revalidatePath("/admin/ceny/");
  redirect(`/admin/ceny/${list.id}/?zapisano=${rows.length}&pominiete=${errors.length}`);
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
