import "server-only";
import { cache } from "react";
import { db } from "./db";
import { CATEGORIES, getCategory, getService, type Category, type Faq, type ServicePage } from "./content";
import { SITE } from "./site";
import { BANNER_DEFAULTS, type BannerKey } from "./banners";
import { mediaUrl } from "./storage";

/**
 * Treści edytowane w panelu administratora.
 * Zmiany są zapisywane w bazie i nakładane na oryginalne teksty z content/services.json.
 * Gdy baza jest niedostępna (np. podczas budowania), serwis pokazuje treści oryginalne.
 */
async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- usługi */

export type ServiceContent = {
  h1: string;
  lead: string | null;
  body: string;
  tagline: string | null;
  ctas: string[];
  faq: Faq[];
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
};

export const SERVICE_FIELDS: (keyof ServiceContent)[] = ["h1", "lead", "body", "tagline", "ctas", "faq", "metaTitle", "metaDescription", "keywords"];

const pageOverride = cache(async (slug: string) => {
  const row = await safe(() => db.pageContent.findUnique({ where: { slug } }));
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data) as Record<string, unknown>, updatedAt: row.updatedAt };
  } catch {
    return null;
  }
});

function pick<T extends object>(base: T, override: Record<string, unknown> | undefined, fields: (keyof T)[]): T {
  if (!override) return base;
  const out = { ...base };
  for (const f of fields) if (override[f as string] !== undefined) (out as Record<string, unknown>)[f as string] = override[f as string];
  return out;
}

export async function getServicePage(slug: string): Promise<(ServicePage & { edited: Date | null }) | null> {
  const base = getService(slug);
  if (!base) return null;
  const o = await pageOverride(slug);
  return { ...pick(base, o?.data, SERVICE_FIELDS as (keyof ServicePage)[]), edited: o?.updatedAt ?? null };
}

/* ---------------------------------------------------------------- kategorie */

export type CategoryContent = {
  h1: string;
  lead: string | null;
  body: string;
  short: string;
  ctas: string[];
  metaTitle: string | null;
  metaDescription: string | null;
};
export const CATEGORY_FIELDS: (keyof CategoryContent)[] = ["h1", "lead", "body", "short", "ctas", "metaTitle", "metaDescription"];

export function categoryDefaults(cat: Category): CategoryContent {
  return {
    h1: cat.parent.h1 ?? cat.name,
    lead: cat.parent.lead,
    body: cat.parent.body,
    short: cat.short,
    ctas: cat.parent.ctas,
    metaTitle: cat.parent.metaTitle,
    metaDescription: cat.parent.metaDescription,
  };
}

export async function getCategoryPage(slug: string): Promise<(Category & { content: CategoryContent; edited: Date | null }) | null> {
  const cat = getCategory(slug);
  if (!cat) return null;
  const o = await pageOverride(`kategoria:${slug}`);
  return { ...cat, content: pick(categoryDefaults(cat), o?.data, CATEGORY_FIELDS), edited: o?.updatedAt ?? null };
}

/** Kategorie z (ewentualnie zmienionym) krótkim opisem – do kafelków na stronie głównej. */
export async function getCategoryCards() {
  const rows = await safe(() => db.pageContent.findMany({ where: { kind: "CATEGORY" } }));
  const map = new Map((rows ?? []).map((r) => [r.slug, r.data]));
  return CATEGORIES.map((c) => {
    let short = c.short;
    const raw = map.get(`kategoria:${c.slug}`);
    if (raw)
      try {
        short = (JSON.parse(raw) as Partial<CategoryContent>).short ?? short;
      } catch {}
    return { ...c, short };
  });
}

/* ---------------------------------------------------------------- ustawienia firmy */

export type SiteSettings = {
  legalName: string | null;
  nip: string | null;
  krs: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  responseTime: string;
  linkedin: string | null;
  facebook: string | null;
};

export const SITE_DEFAULTS: SiteSettings = {
  legalName: SITE.legalName,
  nip: SITE.nip,
  krs: SITE.krs,
  address: SITE.address,
  phone: SITE.phone,
  email: SITE.email,
  openingHours: SITE.openingHours,
  responseTime: "w ciągu jednego dnia roboczego",
  linkedin: SITE.social.linkedin,
  facebook: SITE.social.facebook,
};

async function readSetting<T>(key: string): Promise<Partial<T> | null> {
  const row = await safe(() => db.setting.findUnique({ where: { key } }));
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Partial<T>;
  } catch {
    return null;
  }
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const s = await readSetting<SiteSettings>("site");
  return { ...SITE_DEFAULTS, ...(s ?? {}) };
});

/* ---------------------------------------------------------------- banery */

export type BannerOverride = { mediaId?: string | null; alt?: string; href?: string | null; hidden?: boolean };
export type ResolvedBanner = { src: string; src2x: string | null; w: number; h: number; alt: string; href: string | null; hidden: boolean; replaced: boolean };

export const getBanners = cache(async (): Promise<Record<BannerKey, ResolvedBanner>> => {
  const o = (await readSetting<Record<BannerKey, BannerOverride>>("banners")) ?? {};
  const ids = Object.values(o)
    .map((b) => b?.mediaId)
    .filter((x): x is string => !!x);
  const media = ids.length ? (await safe(() => db.media.findMany({ where: { id: { in: ids } } }))) ?? [] : [];
  const out = {} as Record<BannerKey, ResolvedBanner>;
  for (const key of Object.keys(BANNER_DEFAULTS) as BannerKey[]) {
    const d = BANNER_DEFAULTS[key];
    const ov = o[key] ?? {};
    const m = ov.mediaId ? media.find((x) => x.id === ov.mediaId) : null;
    out[key] = {
      src: m ? mediaUrl(m.storedName) : d.src,
      src2x: m ? null : d.src.replace(/\.jpg$/, "@2x.jpg"),
      w: m?.width ?? d.w,
      h: m?.height ?? d.h,
      alt: ov.alt?.trim() || d.alt,
      href: ov.href === undefined ? null : ov.href,
      hidden: !!ov.hidden,
      replaced: !!m,
    };
  }
  return out;
});

/* ---------------------------------------------------------------- aktualności */

export async function listPublishedPosts(limit = 50) {
  return (
    (await safe(() =>
      db.post.findMany({
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        take: limit,
        include: { cover: true },
      }),
    )) ?? []
  );
}

export async function getPublishedPost(slug: string) {
  return safe(() => db.post.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { lte: new Date() } }, include: { cover: true } }));
}
