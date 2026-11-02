"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "eo_consent";

function readConsent(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return "unknown";
  }
}

/** Zapisuje źródło wejścia (UTM / odsyłacz) – tylko po zgodzie na pliki analityczne. */
function storeAttribution() {
  if (document.cookie.includes("eo_src=")) return;
  const p = new URLSearchParams(window.location.search);
  const parts = ["utm_source", "utm_medium", "utm_campaign"].map((k) => p.get(k)).filter(Boolean);
  let src = parts.join(" / ");
  if (!src && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname;
      if (host !== window.location.hostname) src = `ref: ${host}`;
    } catch {}
  }
  if (!src) src = "bezpośrednio";
  document.cookie = `eo_src=${encodeURIComponent(src.slice(0, 200))}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
}

export function CookieBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const c = readConsent();
    if (c === "all") storeAttribution();
    else if (c == null) setShow(true);
  }, []);
  if (!show) return null;
  const decide = (all: boolean) => {
    try {
      localStorage.setItem(KEY, all ? "all" : "necessary");
    } catch {}
    if (all) storeAttribution();
    setShow(false);
  };
  return (
    <div className="cookie-bar" role="region" aria-label="Pliki cookies">
      <p>
        Używamy niezbędnych plików cookies do działania serwisu i portalu. Za Twoją zgodą zapiszemy też, skąd do nas trafiłeś, aby ulepszać komunikację.{" "}
        <Link href="/polityka-prywatnosci/">Szczegóły</Link>
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn--sm btn--ghost" style={{ color: "#fff", borderColor: "#5b6066" }} onClick={() => decide(false)}>
          Tylko niezbędne
        </button>
        <button type="button" className="btn btn--sm btn--light" onClick={() => decide(true)}>
          Akceptuję
        </button>
      </div>
    </div>
  );
}
