import "server-only";
import { cookies } from "next/headers";

/** Źródło wejścia użytkownika zapisane po zgodzie na pliki analityczne (ciasteczko eo_src). */
export async function readAttribution(): Promise<string | null> {
  const raw = (await cookies()).get("eo_src")?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, 300);
  } catch {
    return null;
  }
}
