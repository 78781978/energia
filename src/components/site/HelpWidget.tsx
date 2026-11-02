"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

/**
 * Widżet pomocy z awatarem Iskry.
 * Docelowo w tym miejscu działa „Asystent AI” (czat) z możliwością przejęcia rozmowy przez konsultanta – zob. README.
 */
export function HelpWidget({ phone }: { phone: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="help-fab" ref={ref}>
      {open && (
        <div className="help-panel" role="dialog" aria-label="Pomoc">
          <div className="help-panel__head">
            <img src="/img/3d/iskra.png" alt="" width={44} height={44} />
            <div>
              <strong>Cześć, tu Iskra</strong>
              <div className="small" style={{ color: "#c9cbce" }}>
                Pomogę Ci znaleźć właściwą drogę.
              </div>
            </div>
          </div>
          <div className="help-panel__body">
            <Link className="help-link" href="/portal/rejestracja/" onClick={() => setOpen(false)}>
              Chcę porównać oferty prądu lub gazu <Icon name="arrowRight" size={18} />
            </Link>
            <Link className="help-link" href="/kontakt/?typ=analiza" onClick={() => setOpen(false)}>
              Chcę przesłać fakturę do analizy <Icon name="arrowRight" size={18} />
            </Link>
            <Link className="help-link" href="/kontakt/?typ=rozmowa" onClick={() => setOpen(false)}>
              Zamów rozmowę z doradcą <Icon name="arrowRight" size={18} />
            </Link>
            {phone && (
              <a className="help-link" href={`tel:${phone.replace(/\s/g, "")}`}>
                Zadzwoń: {phone} <Icon name="phone" size={18} />
              </a>
            )}
            <p className="small muted" style={{ margin: "6px 0 0" }}>
              Masz konto? <Link href="/portal/logowanie/">Zaloguj się do portalu</Link>
            </p>
          </div>
        </div>
      )}
      <button type="button" className="help-fab__btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <img src="/img/3d/iskra.png" alt="" width={36} height={36} />
        <span>{open ? "Zamknij" : "Potrzebujesz pomocy?"}</span>
      </button>
    </div>
  );
}
