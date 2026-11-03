#!/usr/bin/env node
/**
 * Automatyczna konfiguracja zabezpieczeń domeny w Cloudflare (plan darmowy wystarczy).
 *
 * Użycie (na swoim komputerze lub na serwerze, Node.js 18+):
 *   CF_API_TOKEN="…" node cloudflare.js twoja-domena.pl            – konfiguruje
 *   CF_API_TOKEN="…" node cloudflare.js twoja-domena.pl --sprawdz  – tylko sprawdza, niczego nie zmienia
 *
 * Token: Cloudflare → My Profile → API Tokens → Create Token → Custom token z uprawnieniami:
 *   Zone · Zone · Read, Zone · Zone Settings · Edit, Zone · Zone WAF · Edit, Zone · Bot Management · Edit (opcjonalnie),
 *   Zone · DNS · Read, Account · Turnstile · Edit; zakres: tylko ta domena (Zone Resources → Specific zone).
 * Po konfiguracji usuń token w Cloudflare (jest potrzebny tylko na chwilę).
 *
 * Co robi:
 *  1. SSL „Full (strict)”, zawsze HTTPS, TLS min. 1.2, TLS 1.3, automatyczne przepisywanie na https,
 *  2. poziom bezpieczeństwa „medium”, sprawdzanie przeglądarki, Bot Fight Mode,
 *  3. reguła limitu żądań dla logowania, kreatora rejestracji i resetu hasła,
 *  4. widżet Turnstile (captcha) – wypisuje klucze do wpisania w .env,
 *  5. sprawdza rekordy poczty SPF, DKIM, DMARC i czy rekordy strony są za proxy Cloudflare.
 */
const API = process.env.CF_API_BASE || "https://api.cloudflare.com/client/v4"; // CF_API_BASE – tylko do testów
const token = process.env.CF_API_TOKEN;
const domain = (process.argv[2] || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
const checkOnly = process.argv.includes("--sprawdz");

if (!token || !domain || domain.startsWith("--")) {
  console.error('Użycie: CF_API_TOKEN="…" node cloudflare.js twoja-domena.pl [--sprawdz]');
  process.exit(1);
}

async function cf(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error((j.errors || []).map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${r.status}`);
  return j.result;
}

const ok = (m) => console.log("  ✔", m);
const warn = (m) => console.log("  !", m);
const fail = (m) => console.log("  ✖", m);

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    fail(`${name}: ${e.message}`);
  }
}

(async () => {
  const zones = await cf("GET", `/zones?name=${encodeURIComponent(domain)}`);
  if (!zones.length) throw new Error(`Domena ${domain} nie jest dodana do tego konta Cloudflare.`);
  const zone = zones[0];
  const Z = `/zones/${zone.id}`;
  console.log(`Domena ${zone.name} (status: ${zone.status}, plan: ${zone.plan?.name})${checkOnly ? " – tryb sprawdzania" : ""}`);
  if (zone.status !== "active") warn("Domena nie jest aktywna – zmień serwery DNS u rejestratora na te z Cloudflare.");

  console.log("\n1–2. Ustawienia SSL i bezpieczeństwa");
  const wanted = {
    ssl: "strict",
    always_use_https: "on",
    min_tls_version: "1.2",
    tls_1_3: "on",
    automatic_https_rewrites: "on",
    security_level: "medium",
    browser_check: "on",
    opportunistic_encryption: "on",
  };
  for (const [key, value] of Object.entries(wanted)) {
    await step(key, async () => {
      const cur = await cf("GET", `${Z}/settings/${key}`);
      if (cur.value === value) return ok(`${key} = ${value}`);
      if (checkOnly) return warn(`${key} = ${cur.value} (zalecane: ${value})`);
      await cf("PATCH", `${Z}/settings/${key}`, { value });
      ok(`${key}: ${cur.value} → ${value}`);
    });
  }
  await step("Bot Fight Mode", async () => {
    const cur = await cf("GET", `${Z}/bot_management`);
    if (cur.fight_mode) return ok("Bot Fight Mode włączony");
    if (checkOnly) return warn("Bot Fight Mode wyłączony");
    await cf("PUT", `${Z}/bot_management`, { fight_mode: true });
    ok("Bot Fight Mode włączony");
  });

  console.log("\n3. Limit żądań (logowanie, rejestracja, reset hasła)");
  await step("rate limiting", async () => {
    const rule = {
      description: "Energia Online – limit prób logowania i rejestracji",
      expression:
        '(http.request.uri.path contains "/portal/logowanie") or (http.request.uri.path contains "/portal/wniosek") or (http.request.uri.path contains "/portal/reset-hasla") or (http.request.uri.path contains "/api/odczyt-faktury")',
      action: "block",
      // plan darmowy: okno i blokada po 10 s; wystarczy przeciw automatom, limity w aplikacji robią resztę
      ratelimit: { characteristics: ["cf.colo.id", "ip.src"], period: 10, requests_per_period: 20, mitigation_timeout: 10 },
    };
    let current = null;
    try {
      current = await cf("GET", `${Z}/rulesets/phases/http_ratelimit/entrypoint`);
    } catch {
      current = null;
    }
    const exists = current?.rules?.some((r) => r.description === rule.description);
    if (exists) return ok("reguła limitu żądań istnieje");
    if (checkOnly) return warn("brak reguły limitu żądań");
    const others = (current?.rules || []).map(({ id, version, last_updated, ref, ...r }) => r);
    await cf("PUT", `${Z}/rulesets/phases/http_ratelimit/entrypoint`, { rules: [...others, rule] });
    ok("dodano regułę: 20 żądań / 10 s na IP dla logowania, kreatora i resetu hasła");
  });
  await step("WAF", async () => {
    // Plan darmowy ma automatycznie włączony „Cloudflare Free Managed Ruleset”
    const sets = await cf("GET", `${Z}/rulesets/phases/http_request_firewall_managed/entrypoint`).catch(() => null);
    if (sets?.rules?.length) ok(`zarządzane reguły WAF aktywne (${sets.rules.length})`);
    else warn("zarządzane reguły WAF: w planie darmowym działa Free Managed Ruleset (Security → WAF → Managed rules) – sprawdź, czy jest włączony");
  });

  console.log("\n4. Turnstile (captcha przy rejestracji)");
  await step("Turnstile", async () => {
    const acc = zone.account.id;
    const list = await cf("GET", `/accounts/${acc}/challenges/widgets`);
    const found = list.find((w) => (w.domains || []).includes(domain));
    if (found) return ok(`widżet istnieje: TURNSTILE_SITE_KEY="${found.sitekey}" (klucz tajny: Cloudflare → Turnstile → ${found.name} → Settings)`);
    if (checkOnly) return warn("brak widżetu Turnstile dla domeny");
    const w = await cf("POST", `/accounts/${acc}/challenges/widgets`, { name: `Energia Online – ${domain}`, domains: [domain], mode: "managed" });
    ok("utworzono widżet. Wpisz do .env na serwerze:");
    console.log(`\n     TURNSTILE_SITE_KEY="${w.sitekey}"\n     TURNSTILE_SECRET_KEY="${w.secret}"\n`);
  });

  console.log("\n5. Rekordy DNS");
  await step("DNS", async () => {
    const recs = await cf("GET", `${Z}/dns_records?per_page=500`);
    const web = recs.filter((r) => ["A", "AAAA", "CNAME"].includes(r.type) && (r.name === domain || r.name === `www.${domain}`));
    for (const r of web) (r.proxied ? ok : warn)(`${r.type} ${r.name} → ${r.content} ${r.proxied ? "(za proxy Cloudflare)" : "(BEZ proxy – włącz pomarańczową chmurkę)"}`);
    if (!web.length) warn("brak rekordów A/CNAME dla domeny i www");
    const txt = recs.filter((r) => r.type === "TXT");
    const spf = txt.find((r) => r.name === domain && r.content.replace(/"/g, "").startsWith("v=spf1"));
    (spf ? ok : fail)(spf ? `SPF: ${spf.content}` : "brak rekordu SPF – dodaj wartość podaną przez cyber_Folks (panel poczty)");
    const dkim = txt.find((r) => r.name.includes("._domainkey."));
    (dkim ? ok : fail)(dkim ? `DKIM: ${dkim.name}` : "brak rekordu DKIM – włącz DKIM w panelu poczty cyber_Folks i skopiuj rekord");
    const dmarc = txt.find((r) => r.name === `_dmarc.${domain}`);
    (dmarc ? ok : fail)(dmarc ? `DMARC: ${dmarc.content}` : `brak DMARC – dodaj TXT _dmarc z wartością: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`);
    const caa = recs.filter((r) => r.type === "CAA");
    if (!caa.length) warn("brak rekordów CAA (opcjonalne: ograniczają, kto może wystawić certyfikat dla domeny)");
  });

  console.log("\nGotowe. Ustaw w .env na serwerze BEHIND_CLOUDFLARE=1, zrestartuj aplikację i usuń token API w Cloudflare.");
})().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
