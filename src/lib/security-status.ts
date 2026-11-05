import "server-only";
import { headers } from "next/headers";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { db } from "./db";
import { adminTwoFactorRequired } from "./auth";

export type Check = { group: string; label: string; status: "ok" | "warn" | "bad"; detail: string; fix?: string };

const ago = (d: Date) => {
  const h = Math.round((Date.now() - +d) / 3600e3);
  return h < 1 ? "przed chwilą" : h < 48 ? `${h} godz. temu` : `${Math.round(h / 24)} dni temu`;
};

/** Automatyczny przegląd konfiguracji bezpieczeństwa (strona „Stan bezpieczeństwa” w panelu). */
export async function securityChecks(): Promise<Check[]> {
  const h = await headers();
  const env = process.env;
  const out: Check[] = [];
  const add = (c: Check) => out.push(c);
  const prod = env.NODE_ENV === "production";

  // --- połączenie
  const proto = h.get("x-forwarded-proto") ?? (h.get("cf-visitor")?.includes("https") ? "https" : null);
  const host = h.get("host") ?? "";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  add({
    group: "Połączenie",
    label: "HTTPS",
    status: proto === "https" ? "ok" : local ? "warn" : "bad",
    detail: proto === "https" ? "Połączenie szyfrowane." : local ? "Serwer lokalny – na hostingu wymagane HTTPS." : "Strona otwarta bez HTTPS.",
    fix: "DirectAdmin → SSL Certificates → Let's Encrypt; w Cloudflare: SSL Full (strict) i Always Use HTTPS.",
  });
  if (env.COOKIE_INSECURE === "1")
    add({ group: "Połączenie", label: "Ciasteczka bez HTTPS (COOKIE_INSECURE)", status: prod ? "bad" : "warn", detail: "Ustawiono COOKIE_INSECURE=1 – ciasteczko logowania może zostać wysłane bez szyfrowania. Tylko do lokalnego podglądu.", fix: "Usuń COOKIE_INSECURE z .env." });
  const site = env.SITE_URL ?? "";
  add({ group: "Połączenie", label: "Adres strony (SITE_URL)", status: site.startsWith("https://") ? "ok" : "bad", detail: site || "brak", fix: "W .env: SITE_URL=\"https://twoja-domena.pl\"." });
  const viaCf = Boolean(h.get("cf-ray"));
  add({
    group: "Połączenie",
    label: "Cloudflare (WAF, ochrona DDoS)",
    status: viaCf && env.BEHIND_CLOUDFLARE === "1" ? "ok" : viaCf ? "warn" : "warn",
    detail: viaCf ? (env.BEHIND_CLOUDFLARE === "1" ? "Ruch przechodzi przez Cloudflare." : "Ruch idzie przez Cloudflare, ale brak BEHIND_CLOUDFLARE=1 – limity prób widzą adresy Cloudflare.") : "Ruch nie przechodzi przez Cloudflare.",
    fix: "Uruchom deploy/cloudflare.js (konfiguracja automatyczna) i ustaw BEHIND_CLOUDFLARE=1 w .env.",
  });
  if (env.BEHIND_CLOUDFLARE === "1" && !viaCf && !local)
    add({ group: "Połączenie", label: "BEHIND_CLOUDFLARE bez Cloudflare", status: "bad", detail: "Ustawiono BEHIND_CLOUDFLARE=1, ale żądanie nie przyszło przez Cloudflare – nagłówek z adresem IP można wtedy podrobić.", fix: "Włącz proxy Cloudflare (pomarańczowa chmurka) albo usuń BEHIND_CLOUDFLARE." });

  // --- konta
  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { email: true, totpEnabledAt: true, lastLoginAt: true } });
  const no2fa = admins.filter((a) => !a.totpEnabledAt);
  add({
    group: "Konta",
    label: "2FA administratorów",
    status: no2fa.length ? "bad" : "ok",
    detail: no2fa.length ? `Bez 2FA: ${no2fa.map((a) => a.email).join(", ")}` : `Wszyscy administratorzy (${admins.length}) mają 2FA.`,
    fix: "Każdy administrator: Moje konto → Skonfiguruj logowanie dwuetapowe.",
  });
  add({ group: "Konta", label: "Wymóg 2FA w panelu", status: adminTwoFactorRequired() ? "ok" : prod ? "bad" : "warn", detail: adminTwoFactorRequired() ? "Włączony." : "Wyłączony (ADMIN_2FA_REQUIRED=0 lub tryb deweloperski).", fix: "Usuń ADMIN_2FA_REQUIRED z .env." });
  const stale = admins.filter((a) => a.lastLoginAt && Date.now() - +a.lastLoginAt > 90 * 864e5);
  if (stale.length) add({ group: "Konta", label: "Nieużywane konta administratorów", status: "warn", detail: stale.map((a) => a.email).join(", ") + " – brak logowania od 90 dni.", fix: "Zespół → zablokuj konta, które nie są potrzebne." });
  add({ group: "Konta", label: "Hasło startowe w .env", status: env.ADMIN_PASSWORD ? "bad" : "ok", detail: env.ADMIN_PASSWORD ? "ADMIN_PASSWORD nadal jest w konfiguracji." : "Usunięte.", fix: "Usuń linię ADMIN_PASSWORD z .env i zrestartuj aplikację." });
  const demo = await db.user.count({ where: { email: "klient.demo@example.com" } });
  const demoOffers = await db.offer.count({ where: { supplier: { contains: "(demo)" } } });
  add({ group: "Konta", label: "Dane demonstracyjne", status: demo || demoOffers ? (prod ? "bad" : "warn") : "ok", detail: demo || demoOffers ? `Konto demo: ${demo ? "tak" : "nie"}, oferty demo: ${demoOffers}.` : "Brak.", fix: "Zablokuj konto klient.demo@example.com (Klienci) i usuń oferty „(demo)”." });

  // --- formularze i poczta
  add({ group: "Formularze i poczta", label: "Captcha Turnstile", status: env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY ? "ok" : "warn", detail: env.TURNSTILE_SITE_KEY ? "Klucze ustawione." : "Brak kluczy – działa tylko pole-pułapka i limit czasu.", fix: "deploy/cloudflare.js tworzy klucze; wpisz je do .env." });
  add({ group: "Formularze i poczta", label: "Wysyłka e-mail (SMTP)", status: env.SMTP_HOST ? "ok" : "bad", detail: env.SMTP_HOST ? `Serwer ${env.SMTP_HOST}.` : "Brak SMTP – e-maile (weryfikacja, reset hasła) nie wychodzą.", fix: "Uzupełnij SMTP_* w .env." });
  add({ group: "Formularze i poczta", label: "Powiadomienia zespołu", status: env.NOTIFY_EMAIL ? "ok" : "warn", detail: env.NOTIFY_EMAIL ?? "brak NOTIFY_EMAIL", fix: "W .env: NOTIFY_EMAIL." });

  // --- zadania w tle
  const cs = env.CRON_SECRET ?? "";
  add({ group: "Zadania i kopie", label: "Klucz zadań (CRON_SECRET)", status: cs.length >= 32 ? "ok" : cs ? "warn" : "bad", detail: cs ? `${cs.length} znaków` : "brak – przypomnienia wyłączone", fix: "Losowy ciąg min. 32 znaki z menedżera haseł." });
  const job = await db.setting.findUnique({ where: { key: "job:przypomnienia" } });
  const jobAt = job ? new Date((JSON.parse(job.value) as { at: string }).at) : null;
  add({
    group: "Zadania i kopie",
    label: "Przypomnienia e-mail",
    status: jobAt && Date.now() - +jobAt < 26 * 3600e3 ? "ok" : jobAt ? "warn" : "bad",
    detail: jobAt ? `Ostatnio ${ago(jobAt)} (${(JSON.parse(job!.value) as { by?: string }).by === "auto" ? "automatycznie" : "z harmonogramu"}).` : "Jeszcze nie uruchomione.",
    fix: "Zadanie cron z WDROZENIE-CYBERFOLKS.md (krok 7). Aplikacja uruchamia je też sama raz na dobę.",
  });
  const dir = env.KOPIE_DIR || path.join(os.homedir(), "kopie");
  let newest: Date | null = null;
  try {
    for (const f of await fs.readdir(dir)) if (f.startsWith("baza_")) {
      const st = await fs.stat(path.join(dir, f));
      if (!newest || st.mtime > newest) newest = st.mtime;
    }
  } catch {
    /* brak katalogu */
  }
  add({
    group: "Zadania i kopie",
    label: "Kopia zapasowa",
    status: newest && Date.now() - +newest < 26 * 3600e3 ? "ok" : newest ? "warn" : prod ? "bad" : "warn",
    detail: newest ? `Ostatnia kopia bazy ${ago(newest)} (${dir}).` : `Brak kopii w ${dir}.`,
    fix: "Zadanie cron z kopia.sh (krok 8) albo AUTO_KOPIA=1 w .env. Raz w tygodniu skopiuj kopię poza hosting.",
  });

  // --- pliki
  if (env.VERCEL)
    add({ group: "Pliki", label: "Podgląd na Vercelu", status: "warn", detail: "Pliki klientów i obrazy z panelu są tymczasowe (/tmp) i znikają po restarcie funkcji. Tylko do prezentacji – nie przyjmuj prawdziwych dokumentów.", fix: "Produkcyjnie: hosting z trwałym dyskiem (cyber_Folks)." });
  const { antivirusConfigured } = await import("./filescan");
  add({
    group: "Pliki",
    label: "Kontrola przesyłanych plików",
    status: antivirusConfigured() ? "ok" : "warn",
    detail: antivirusConfigured()
      ? `Analiza zawartości + antywirus ClamAV (${env.CLAMAV_HOST || env.CLAMAV_SOCKET}${env.CLAMAV_REQUIRED === "1" ? ", obowiązkowy" : ""}).`
      : "Działa analiza zawartości (PDF bez skryptów i osadzonych plików, XML bez DOCTYPE, test EICAR). Antywirus ClamAV nie jest podłączony.",
    fix: "Jeśli hosting udostępnia ClamAV (clamd), ustaw CLAMAV_HOST lub CLAMAV_SOCKET w .env.",
  });
  const storage = path.resolve(env.STORAGE_DIR || (env.VERCEL ? "/tmp/energia-pliki" : "./storage"));
  const inPublic = /public_html|\/public(\/|$)/.test(storage) || storage.startsWith(path.resolve("public"));
  add({ group: "Pliki", label: "Katalog plików klientów", status: inPublic ? "bad" : "ok", detail: storage, fix: "STORAGE_DIR poza public_html, np. /home/LOGIN/energia-pliki." });
  try {
    const st = await fs.stat(path.join(process.cwd(), ".env"));
    const open = (st.mode & 0o077) !== 0;
    add({ group: "Pliki", label: "Uprawnienia pliku .env", status: open ? "warn" : "ok", detail: `tryb ${(st.mode & 0o777).toString(8)}`, fix: "chmod 600 .env" });
  } catch {
    /* zmienne ustawione w panelu hostingu – brak pliku */
  }
  return out;
}
