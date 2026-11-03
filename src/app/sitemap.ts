import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/content";
import { SITE } from "@/lib/site";
import { listPublishedPosts } from "@/lib/cms";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await listPublishedPosts(1000);
  const now = new Date();
  const url = (p: string) => `${SITE.url}${p}`;
  return [
    { url: url("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: url("/jak-to-dziala/"), lastModified: now, priority: 0.8 },
    { url: url("/kontakt/"), lastModified: now, priority: 0.7 },
    { url: url("/o-nas/"), lastModified: now, priority: 0.5 },
    ...CATEGORIES.map((c) => ({ url: url(`/${c.slug}/`), lastModified: now, priority: 0.9 })),
    ...CATEGORIES.flatMap((c) => c.services.map((s) => ({ url: url(`/${s.slug}/`), lastModified: now, priority: 0.8 }))),
    { url: url("/aktualnosci/"), lastModified: now, priority: 0.6 },
    ...posts.map((p) => ({ url: url(`/aktualnosci/${p.slug}/`), lastModified: p.updatedAt, priority: 0.5 })),
  ];
}
