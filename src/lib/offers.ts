import "server-only";
import { db } from "./db";
import { OFFER_EDIT_HOURS } from "./wizard";

/** Warianty, przy których klient zostawia wybór doradcy – dopuszczamy każdy model cenowy. */
const OPEN_MODELS = new Set(["INDYWIDUALNA", "ANALIZA_OPTYMALNA"]);

/**
 * Generator ofert: dobiera do wniosku maksymalnie 3 aktywne oferty z bazy (media, warianty, lata, ważność).
 * Propozycje są oznaczone jako automatyczne – doradca może je zmienić przez 24 godziny.
 */
export async function autoMatchOffers(applicationId: string, limit = 3): Promise<number> {
  const app = await db.application.findUnique({ where: { id: applicationId }, include: { offers: true } });
  if (!app) return 0;
  const models = new Set((app.priceModels ?? app.priceModel).split(",").filter(Boolean));
  const anyModel = [...models].some((m) => OPEN_MODELS.has(m));
  const years = new Set(app.years.split(",").filter(Boolean));
  const now = new Date();
  const offers = await db.offer.findMany({
    where: {
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      media: app.media === "PRAD_GAZ" ? { in: ["PRAD_GAZ", "PRAD", "GAZ"] } : { in: [app.media, "PRAD_GAZ"] },
    },
  });
  const taken = new Set(app.offers.map((o) => o.offerId));
  const scored = offers
    .filter((o) => !taken.has(o.id))
    .map((o) => {
      const modelHit = models.has(o.priceModel);
      const yearHits = o.years.split(",").filter((y) => years.has(y.trim())).length;
      const score = (modelHit ? 10 : 0) + (o.media === app.media ? 4 : 0) + yearHits * 2;
      return { o, modelHit, yearHits, score };
    })
    .filter((x) => (x.modelHit || anyModel) && (x.yearHits > 0 || !x.o.years))
    .sort((a, b) => b.score - a.score || (a.o.priceNetMWh ?? Infinity) - (b.o.priceNetMWh ?? Infinity))
    .slice(0, Math.max(0, limit - app.offers.length));
  if (!scored.length) return 0;
  const editableUntil = new Date(now.getTime() + OFFER_EDIT_HOURS * 3600e3);
  await db.offerAssignment.createMany({
    data: scored.map(({ o }) => ({ offerId: o.id, applicationId, auto: true, editableUntil })),
  });
  return scored.length;
}
