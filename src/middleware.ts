import { NextResponse, type NextRequest } from "next/server";

/**
 * Hasło do podglądu (np. tymczasowa wersja na Vercelu): ustaw PREVIEW_USER i PREVIEW_PASSWORD.
 * Przeglądarka zapyta o login i hasło przed pokazaniem jakiejkolwiek strony. Bez tych zmiennych nic nie robi.
 */
export function middleware(req: NextRequest) {
  const user = process.env.PREVIEW_USER;
  const pass = process.env.PREVIEW_PASSWORD;
  if (!user || !pass) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      const p = rest.join(":");
      if (safeEqual(u, user) && safeEqual(p, pass)) return NextResponse.next();
    } catch {
      /* niepoprawny nagłówek */
    }
  }
  return new NextResponse("Podgląd chroniony hasłem.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Energia - podglad", charset="UTF-8"', "Cache-Control": "no-store" },
  });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const config = {
  // wszystko poza plikami statycznymi Next.js; zadanie przypomnień ma własny klucz
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron|api/crm-plik).*)"],
};
