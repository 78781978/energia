import { requireAdmin } from "@/lib/auth";
import { getBanners } from "@/lib/cms";
import { BANNER_DEFAULTS, BANNER_LABELS, type BannerKey } from "@/lib/banners";
import { PageHead } from "@/components/app/ui";
import { BannerForm } from "@/components/app/CmsForms";
import { resetBanner } from "@/app/actions/cms";
import { Icon } from "@/components/Icon";

export const metadata = { title: "Banery i grafiki" };

/** Domyślne linki banerów – jak na stronie */
const DEFAULT_HREF: Partial<Record<BannerKey, string>> = {
  lepszaEnergia: "/portal/wniosek/",
  rozwiazania: "#kategorie",
  spoldzielnie: "/spoldzielnie-energetyczne-i-dsr/",
  kierunek: "/portal/wniosek/",
  doradca: "/energia-360/",
  proces: "/jak-to-dziala/",
};

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ przywrocono?: string }> }) {
  await requireAdmin();
  const banners = await getBanners();
  const sp = await searchParams;
  return (
    <>
      <PageHead title="Banery i grafiki" sub="Podmień grafikę, opis lub link. Grafiki są zawsze pokazywane w całości, w oryginalnych proporcjach." />
      {sp.przywrocono && (
        <div className="alert alert--ok" style={{ marginBottom: 16 }}>
          <Icon name="checkCircle" />
          <p>Przywrócono oryginalną grafikę.</p>
        </div>
      )}
      <div className="stack">
        {(Object.keys(BANNER_DEFAULTS) as BannerKey[]).map((k) => {
          const b = banners[k];
          return (
            <section key={k} className="panel">
              <div className="panel__head">
                <h2>{BANNER_LABELS[k]}</h2>
                <div className="btn-row" style={{ alignItems: "center" }}>
                  {b.hidden && <span className="badge badge--warn">ukryty</span>}
                  {b.replaced && <span className="badge badge--info">podmieniony</span>}
                  {(b.replaced || b.href !== null || b.hidden || b.alt !== BANNER_DEFAULTS[k].alt) && (
                    <form action={resetBanner}>
                      <input type="hidden" name="key" value={k} />
                      <button className="btn btn--ghost btn--sm" type="submit">
                        Przywróć oryginał
                      </button>
                    </form>
                  )}
                </div>
              </div>
              <div className="two-col">
                <img src={b.src} alt="" width={b.w} height={b.h} style={{ width: "100%", height: "auto", borderRadius: 14, border: "1px solid var(--line)", opacity: b.hidden ? 0.4 : 1 }} />
                <BannerForm k={k} alt={b.alt} href={b.href} hidden={b.hidden} defaultHref={DEFAULT_HREF[k] ?? null} />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
