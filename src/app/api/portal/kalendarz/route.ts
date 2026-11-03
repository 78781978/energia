import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { meterRows } from "@/lib/meters";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** Plik kalendarza (.ics): końce umów i terminy wypowiedzeń liczników klienta – do Google, Outlook, Apple. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") return new NextResponse("Brak dostępu", { status: 401 });
  const rows = await meterRows(user.id);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const events: string[] = [];
  const add = (uid: string, date: Date, title: string, desc: string, alarmDays: number) => {
    const next = new Date(+date + 864e5);
    events.push(
      ["BEGIN:VEVENT", `UID:${uid}@energia-online`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day(date)}`, `DTEND;VALUE=DATE:${day(next)}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(desc)}`, "BEGIN:VALARM", `TRIGGER:-P${alarmDays}D`, "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM", "END:VEVENT"].join("\r\n"),
    );
  };
  for (const r of rows) {
    const label = r.name || r.ppeNumber || (r.medium === "GAZ" ? "licznik gazu" : "licznik prądu");
    if (r.noticeDate) add(`notice-${r.id}`, r.noticeDate, `Termin wypowiedzenia umowy – ${label}`, `Ostatni dzień na wypowiedzenie obecnej umowy. Złóż zamówienie: ${SITE.url}/portal/wniosek/`, 14);
    const end = r.end ?? r.currentEnd;
    if (end) add(`end-${r.id}`, end, `Koniec umowy – ${label}`, `Koniec umowy na ${r.medium === "GAZ" ? "gaz" : "energię"} (${r.ppeNumber ?? "-"}). ${SITE.url}/portal/liczniki/`, 30);
  }
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Energia Online//Portal Klienta//PL", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Energia Online – umowy", ...events, "END:VCALENDAR"].join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="umowy-energia.ics"', "Cache-Control": "private, no-store" },
  });
}
