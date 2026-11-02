import type { Company, MeteringPoint } from "@prisma/client";
import type { CompanyDraft, PointDraft } from "@/app/portal/(panel)/wniosek/ApplicationWizard";

export function companyDraft(c: Company | null, fallback: { email: string; name: string | null; phone: string | null }): CompanyDraft {
  return {
    id: c?.id,
    companyName: c?.name ?? "",
    nip: c?.nip ?? "",
    regon: c?.regon ?? "",
    legalForm: c?.legalForm ?? "",
    contactName: c?.contactName ?? fallback.name ?? "",
    contactPhone: c?.contactPhone ?? fallback.phone ?? "",
    contactEmail: c?.contactEmail ?? fallback.email,
    hqStreet: c?.hqStreet ?? "",
    hqPostalCode: c?.hqPostalCode ?? "",
    hqCity: c?.hqCity ?? "",
    corrDifferent: c ? !c.corrSameAsHq : false,
    corrStreet: c?.corrStreet ?? "",
    corrPostalCode: c?.corrPostalCode ?? "",
    corrCity: c?.corrCity ?? "",
  };
}

export function pointDrafts(points: MeteringPoint[]): PointDraft[] {
  return points.map((p) => ({
    key: p.id,
    id: p.id,
    medium: p.medium === "GAZ" ? "GAZ" : "PRAD",
    ppeNumber: p.ppeNumber ?? "",
    street: p.street ?? "",
    postalCode: p.postalCode ?? "",
    city: p.city ?? "",
    currentSeller: p.currentSeller ?? "",
    operator: p.operator ?? "",
    tariff: p.tariff ?? "",
    annualUsageMWh: p.annualUsageMWh != null ? String(p.annualUsageMWh) : "",
    contractedPowerKw: p.contractedPowerKw != null ? String(p.contractedPowerKw) : "",
    contractEndDate: p.contractEndDate ? p.contractEndDate.toISOString().slice(0, 10) : "",
  }));
}
