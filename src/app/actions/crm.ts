"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEAD_TYPES } from "@/lib/constants";
import { SITE } from "@/lib/site";
import { livespaceConfigured, pushLeadToLivespace } from "@/lib/livespace";
import { str } from "@/lib/validators";

/** Ponowne wysłanie zgłoszenia do Livespace (np. po poprawieniu kluczy API). */
export async function resendLeadToCrm(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = str(fd.get("leadId"), 40);
  const l = await db.lead.findUnique({ where: { id } });
  if (!l || !livespaceConfigured()) return;
  try {
    const r = await pushLeadToLivespace({
      kind: l.type,
      kindLabel: LEAD_TYPES[l.type as keyof typeof LEAD_TYPES] ?? l.type,
      name: l.type === "TELEFON" && l.name === "Prośba o telefon" ? null : l.name,
      company: l.company,
      nip: l.nip,
      email: l.email || null,
      phone: l.phone,
      topic: l.topic,
      message: l.message,
      page: l.pagePath,
      adminUrl: `${SITE.url}/admin/zapytania/${l.id}/`,
    });
    await db.lead.update({ where: { id }, data: { crmId: r.contactId, crmError: null } });
  } catch (e) {
    await db.lead.update({ where: { id }, data: { crmError: (e as Error).message.slice(0, 500) } });
  }
  revalidatePath(`/admin/zapytania/${id}/`);
}
