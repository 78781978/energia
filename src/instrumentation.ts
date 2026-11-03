/**
 * Zadania w tle uruchamiane razem z serwerem – zabezpieczenie na wypadek, gdyby na hostingu
 * nie skonfigurowano harmonogramu zadań (cron) albo przestał działać:
 * - przypomnienia e-mail: raz na dobę (wymaga CRON_SECRET i SITE_URL),
 * - kopia zapasowa kopia.sh: raz na dobę, gdy AUTO_KOPIA=1 (wymaga pg_dump na serwerze).
 * Cron na hostingu pozostaje zalecany: aplikacja może być usypiana, gdy nikt nie odwiedza strony.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const g = globalThis as unknown as { __eoJobs?: boolean };
  if (g.__eoJobs) return;
  g.__eoJobs = true;

  const HOUR = 3600e3;
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET || "";

  async function reminders() {
    if (!site || secret.length < 16) return;
    try {
      await fetch(`${site}/api/cron/przypomnienia/?zrodlo=auto&tylko-zalegle=1`, { headers: { Authorization: `Bearer ${secret}` } });
    } catch (e) {
      console.error("[zadania] przypomnienia:", (e as Error).message);
    }
  }

  async function backup() {
    if (process.env.AUTO_KOPIA !== "1") return;
    const path = await import("node:path");
    const fs = await import("node:fs");
    const { spawn } = await import("node:child_process");
    const script = path.join(process.cwd(), "kopia.sh");
    if (!fs.existsSync(script)) return;
    const child = spawn("bash", [script, "--jesli-potrzeba"], { stdio: ["ignore", "pipe", "pipe"], detached: false });
    child.stdout.on("data", (d) => console.info("[kopia]", String(d).trim()));
    child.stderr.on("data", (d) => console.error("[kopia]", String(d).trim()));
  }

  const tick = () => {
    void reminders();
    void backup();
  };
  // pierwsze uruchomienie po 2 minutach od startu, potem co godzinę (zadania same sprawdzają, czy już były wykonane dziś)
  setTimeout(tick, Number(process.env.ZADANIA_OPOZNIENIE_S || 120) * 1000).unref?.();
  setInterval(tick, HOUR).unref?.();
}
