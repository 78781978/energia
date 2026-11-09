import { after } from "next/server";
import { db } from "./db";
import { livespaceConfigured, pushLeadToLivespace, type CrmLead } from "./livespace";

/** Wysyła zgłoszenie do Livespace po odpowiedzi dla klienta (nie spowalnia formularza); wynik zapisuje przy zgłoszeniu. */
export function syncLeadToCrm(leadId: string, lead: CrmLead) {
  if (!livespaceConfigured()) return;
  after(async () => {
    try {
      const r = await pushLeadToLivespace(lead);
      await db.lead.update({ where: { id: leadId }, data: { crmId: r.contactId, crmError: null } });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      console.error("[livespace]", msg);
      await db.lead.update({ where: { id: leadId }, data: { crmError: msg } }).catch(() => {});
    }
  });
}
