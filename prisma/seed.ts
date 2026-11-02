/**
 * Tworzy konto administratora (ADMIN_EMAIL / ADMIN_PASSWORD z .env).
 * Z flagą --demo dodaje przykładowego klienta, wniosek i oferty (do prezentacji / testów).
 *   npm run db:seed
 *   npm run db:seed -- --demo
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 10) throw new Error("Ustaw ADMIN_EMAIL i ADMIN_PASSWORD (min. 10 znaków) w pliku .env");
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN" },
    create: { email, role: "ADMIN", name: "Administrator", passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ Administrator: ${admin.email}`);

  if (!process.argv.includes("--demo")) return;

  const year = new Date().getFullYear() + 1;
  const offers = await Promise.all(
    [
      { name: "Stała cena 24 mies.", supplier: "Sprzedawca A (demo)", priceModel: "STALA", priceNetMWh: 589, tradeFeeMonthly: 39 },
      { name: "Stała cena 36 mies.", supplier: "Sprzedawca B (demo)", priceModel: "STALA", priceNetMWh: 572, tradeFeeMonthly: 49 },
      { name: "RDN + marża", supplier: "Sprzedawca C (demo)", priceModel: "RDN", priceNetMWh: 18, tradeFeeMonthly: 0 },
    ].map((o) =>
      db.offer.create({
        data: { ...o, media: "PRAD", years: `${year},${year + 1}`, validUntil: new Date(Date.now() + 14 * 864e5), description: "Oferta demonstracyjna – dane przykładowe." },
      }),
    ),
  );

  const clientEmail = "klient.demo@example.com";
  const existing = await db.user.findUnique({ where: { email: clientEmail } });
  if (existing) {
    console.log("• Dane demo już istnieją");
    return;
  }
  const client = await db.user.create({
    data: { email: clientEmail, name: "Anna Przykładowa", phone: "+48 600 000 000", passwordHash: await bcrypt.hash("KlientDemo2026", 12), source: "google / cpc / demo" },
  });
  const company = await db.company.create({
    data: {
      ownerId: client.id,
      name: "Przykładowa Piekarnia sp. z o.o.",
      nip: "5260250274",
      legalForm: "Spółka z o.o.",
      contactName: "Anna Przykładowa",
      contactPhone: "+48 600 000 000",
      contactEmail: clientEmail,
      hqStreet: "ul. Energetyczna 1",
      hqPostalCode: "00-001",
      hqCity: "Warszawa",
      points: {
        create: [
          { ppeNumber: "PL0037000000000001", street: "ul. Energetyczna 1", postalCode: "00-001", city: "Warszawa", currentSeller: "Obecny sprzedawca", operator: "OSD (demo)", tariff: "C21", annualUsageMWh: 180, contractedPowerKw: 60 },
          { ppeNumber: "PL0037000000000002", street: "ul. Piekarska 5", postalCode: "00-002", city: "Warszawa", currentSeller: "Obecny sprzedawca", operator: "OSD (demo)", tariff: "C12b", annualUsageMWh: 42, contractedPowerKw: 25 },
        ],
      },
    },
    include: { points: true },
  });
  const app = await db.application.create({
    data: {
      number: `EO/${new Date().getFullYear()}/0001`,
      userId: client.id,
      companyId: company.id,
      media: "PRAD",
      years: `${year},${year + 1}`,
      priceModel: "STALA",
      tariff: "C21",
      annualUsageMWh: 222,
      status: "W_TRAKCIE_WERYFIKACJI",
      source: "google / cpc / demo",
      points: { create: company.points.map((p) => ({ pointId: p.id })) },
      statusChanges: {
        create: [
          { toStatus: "WNIOSEK_UTWORZONY", changedById: client.id, comment: "Wniosek złożony przez klienta" },
          { fromStatus: "WNIOSEK_UTWORZONY", toStatus: "W_TRAKCIE_WERYFIKACJI", changedById: admin.id, comment: "Analizujemy dane z faktury" },
        ],
      },
      notes: { create: { authorId: admin.id, body: "Klient pyta o możliwość zakupu w transzach na 2028 r." } },
    },
  });
  await db.offerAssignment.createMany({ data: offers.slice(0, 2).map((o) => ({ offerId: o.id, applicationId: app.id })) });
  await db.message.create({ data: { recipientId: client.id, authorId: admin.id, applicationId: app.id, body: "Dzień dobry! Przygotowaliśmy dwie oferty ze stałą ceną – porównaj je w szczegółach wniosku." } });
  console.log(`✔ Demo: klient ${clientEmail} / hasło KlientDemo2026, wniosek ${app.number}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
