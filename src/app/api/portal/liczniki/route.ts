import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { meterRows, PRIORITY_LABEL } from "@/lib/meters";

export const dynamic = "force-dynamic";

const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
const n = (x: number | null) => (x == null ? "" : String(x).replace(".", ","));
// Ochrona przed wstrzykiwaniem formuł w arkuszu (=, +, -, @)
const cell = (v: string) => {
  const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Eksport liczników klienta do CSV (średnik + BOM – otwiera się poprawnie w polskim Excelu). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") return new NextResponse("Brak dostępu", { status: 401 });
  const rows = await meterRows(user.id);
  const head = ["Firma", "Medium", "Nazwa licznika", "Numer licznika", "PPE/PPG", "Adres", "Status", "Dostawca", "Produkt", "Cena netto zł/MWh", "Początek umowy", "Koniec umowy", "Koniec obecnej umowy", "Termin wypowiedzenia", "Roczne zużycie MWh", "Oszczędności zł", "Priorytet"];
  const lines = rows.map((r) =>
    [r.companyName, r.medium === "GAZ" ? "Gaz" : "Prąd", r.name ?? "", r.meterNumber ?? "", r.ppeNumber ?? "", r.address, r.status, r.supplier ?? "", r.product ?? "", n(r.priceNetMWh), d(r.start), d(r.end), d(r.currentEnd), d(r.noticeDate), n(r.usageMWh), n(r.savingsPln), r.priority ? (PRIORITY_LABEL[r.priority] ?? r.priority) : ""]
      .map(cell)
      .join(";"),
  );
  const csv = "﻿" + [head.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="liczniki-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
