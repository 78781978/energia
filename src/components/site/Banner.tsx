import Link from "next/link";
import { getBanners } from "@/lib/cms";
import type { BannerKey } from "@/lib/banners";

export type { BannerKey } from "@/lib/banners";

/** Grafika w całości – dane (obraz, opis, link, widoczność) z panelu Treści → Banery. */
export async function Banner({ name, href, label, priority = false, className = "" }: { name: BannerKey; href?: string; label?: string; priority?: boolean; className?: string }) {
  const b = (await getBanners())[name];
  if (b.hidden) return null;
  const link = b.href ?? href;
  const square = b.w === b.h;
  const img = (
    <img
      src={b.src}
      srcSet={b.src2x ? `${b.src} ${b.w}w, ${b.src2x} ${b.w * 2}w` : undefined}
      sizes={b.src2x ? (square ? "(max-width: 760px) 100vw, 560px" : "(max-width: 1248px) 100vw, 1152px") : undefined}
      alt={b.alt}
      width={b.w}
      height={b.h}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
    />
  );
  return (
    <figure className={`banner ${className}`}>
      {link ? (
        <Link href={link} aria-label={label} className="banner__link">
          {img}
        </Link>
      ) : (
        img
      )}
    </figure>
  );
}
