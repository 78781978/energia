import "server-only";
import { db } from "./db";
import { PRICE_MODELS, STATUS_LABEL, type AppStatus } from "./constants";

export type MeterRow = {
  id: string;
  medium: "PRAD" | "GAZ";
  name: string | null;
  meterNumber: string | null;
  ppeNumber: string | null;
  address: string;
  status: string;
  supplier: string | null;
  product: string | null;
  priceNetMWh: number | null;
  start: Date | null;
  end: Date | null;
  currentEnd: Date | null;
  noticeDate: Date | null;
  savingsPln: number | null;
  priority: string | null;
  usageMWh: number | null;
  companyName: string;
};

/** Zestawienie liczników klienta z danymi umów (wybrana oferta z najnowszego zamówienia, w którym występuje licznik). */
export async function meterRows(userId: string): Promise<MeterRow[]> {
  const points = await db.meteringPoint.findMany({
    where: { company: { ownerId: userId } },
    orderBy: [{ companyId: "asc" }, { createdAt: "asc" }],
    include: {
      company: { select: { name: true } },
      applications: {
        include: { application: { include: { offers: { where: { status: "WYBRANA" }, include: { offer: true } } } } },
      },
    },
  });
  return points.map((p) => {
    const apps = p.applications.map((a) => a.application).sort((a, b) => +b.createdAt - +a.createdAt);
    const app = apps[0];
    const chosen = apps.flatMap((a) => a.offers)[0];
    const noticeDate = p.contractEndDate && p.noticeDays != null ? new Date(+p.contractEndDate - p.noticeDays * 864e5) : null;
    return {
      id: p.id,
      medium: p.medium === "GAZ" ? "GAZ" : "PRAD",
      name: p.name,
      meterNumber: p.meterNumber,
      ppeNumber: p.ppeNumber,
      address: [p.street, p.postalCode, p.city].filter(Boolean).join(", "),
      status: app ? (STATUS_LABEL[app.status as AppStatus] ?? app.status) : "Bez zamówienia",
      supplier: chosen?.offer.supplier ?? p.currentSeller,
      product: chosen ? `${chosen.offer.name} (${PRICE_MODELS[chosen.offer.priceModel as keyof typeof PRICE_MODELS]?.label ?? chosen.offer.priceModel})` : null,
      priceNetMWh: chosen ? (chosen.customPriceNetMWh ?? chosen.offer.priceNetMWh) : null,
      start: p.newContractStart,
      end: p.newContractEnd,
      currentEnd: p.contractEndDate,
      noticeDate,
      savingsPln: p.savingsPln,
      priority: p.priority,
      usageMWh: p.annualUsageMWh,
      companyName: p.company.name,
    };
  });
}

export const PRIORITY_LABEL: Record<string, string> = { WYSOKI: "Wysoki", SREDNI: "Średni", NISKI: "Niski" };
