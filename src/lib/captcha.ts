import "server-only";

/**
 * Ochrona formularzy przed botami.
 * - Cloudflare Turnstile (gdy ustawiono TURNSTILE_SITE_KEY i TURNSTILE_SECRET_KEY) – darmowa captcha bez obrazków i śledzenia,
 * - zawsze: pole-pułapka (honeypot) i minimalny czas wypełnienia formularza.
 */
export const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || "";

export async function verifyHuman(fd: FormData, ip: string, minSeconds = 4): Promise<string | null> {
  if (String(fd.get("website") ?? "")) return "Nie udało się wysłać formularza.";
  const started = Number(fd.get("_t") ?? 0);
  if (started && Date.now() - started < minSeconds * 1000) return "Formularz został wysłany zbyt szybko. Spróbuj ponownie.";
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;
  const token = String(fd.get("cf-turnstile-response") ?? "");
  if (!token) return "Potwierdź, że nie jesteś robotem.";
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const j = (await r.json()) as { success?: boolean };
    return j.success ? null : "Weryfikacja „nie jestem robotem” nie powiodła się. Spróbuj ponownie.";
  } catch {
    return "Nie udało się sprawdzić zabezpieczenia. Spróbuj ponownie za chwilę.";
  }
}
