"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/applications";
import { categoryOf, getCategory, getService } from "@/lib/content";
import { CATEGORY_FIELDS, SERVICE_FIELDS, SITE_DEFAULTS, categoryDefaults, type SiteSettings } from "@/lib/cms";
import { BANNER_DEFAULTS, type BannerKey } from "@/lib/banners";
import { saveImage, UploadError } from "@/lib/storage";
import { isValidEmail, slugify, str } from "@/lib/validators";
import type { FormState } from "@/lib/forms";

const lines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

function parseFaq(raw: string): { q: string; a: string }[] {
  try {
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({ q: String(x?.q ?? "").trim().slice(0, 300), a: String(x?.a ?? "").trim().slice(0, 4000) }))
      .filter((x) => x.q && x.a)
      .slice(0, 40);
  } catch {
    return [];
  }
}

/** Zmienione pola względem poprzedniej wersji – do logu zmian. */
function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, [unknown, unknown]> = {};
  for (const k of Object.keys(after)) {
    const a = JSON.stringify(before[k] ?? null);
    const b = JSON.stringify(after[k] ?? null);
    if (a !== b) out[k] = [String(before[k] ?? "").slice(0, 80), String(after[k] ?? "").slice(0, 80)];
  }
  return out;
}

/* ---------------------------------------------------------------- usługi */

export async function saveServiceContent(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const slug = str(fd.get("slug"), 120);
  const base = getService(slug);
  if (!base) return { error: "Nie znaleziono podstrony." };
  const data = {
    h1: str(fd.get("h1"), 200),
    lead: str(fd.get("lead"), 400) || null,
    body: String(fd.get("body") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 60000),
    tagline: str(fd.get("tagline"), 300) || null,
    ctas: lines(String(fd.get("ctas") ?? "")).slice(0, 6),
    faq: parseFaq(String(fd.get("faq") ?? "")),
    metaTitle: str(fd.get("metaTitle"), 120) || null,
    metaDescription: str(fd.get("metaDescription"), 320) || null,
    keywords: str(fd.get("keywords"), 1000)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  };
  const fe: Record<string, string> = {};
  if (data.h1.length < 3) fe.h1 = "Wpisz nagłówek strony (H1).";
  if (data.body.length < 20) fe.body = "Treść strony jest za krótka.";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };

  const prev = await db.pageContent.findUnique({ where: { slug } });
  const before = prev ? JSON.parse(prev.data) : Object.fromEntries(SERVICE_FIELDS.map((f) => [f, base[f]]));
  await db.pageContent.upsert({
    where: { slug },
    create: { slug, kind: "SERVICE", data: JSON.stringify(data), updatedById: admin.id },
    update: { data: JSON.stringify(data), updatedById: admin.id },
  });
  await audit(admin.id, "PageContent", slug, "update", changedFields(before, data));
  const cat = categoryOf(base);
  revalidatePath(`/${slug}/`);
  revalidatePath(`/${cat.slug}/`);
  revalidatePath("/");
  return { ok: true, message: "Zapisano. Zmiany są już widoczne na stronie." };
}

export async function resetPageContent(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const key = str(fd.get("key"), 140);
  await db.pageContent.deleteMany({ where: { slug: key } });
  await audit(admin.id, "PageContent", key, "reset");
  const slug = key.replace(/^kategoria:/, "");
  revalidatePath(`/${slug}/`);
  const svc = getService(slug);
  if (svc) revalidatePath(`/${categoryOf(svc).slug}/`);
  revalidatePath("/");
  redirect(key.startsWith("kategoria:") ? `/admin/tresci/kategoria/${slug}/?przywrocono=1` : `/admin/tresci/usluga/${slug}/?przywrocono=1`);
}

/* ---------------------------------------------------------------- kategorie */

export async function saveCategoryContent(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const slug = str(fd.get("slug"), 120);
  const cat = getCategory(slug);
  if (!cat) return { error: "Nie znaleziono kategorii." };
  const data = {
    h1: str(fd.get("h1"), 200),
    lead: str(fd.get("lead"), 400) || null,
    body: String(fd.get("body") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 30000),
    short: str(fd.get("short"), 200),
    ctas: lines(String(fd.get("ctas") ?? "")).slice(0, 4),
    metaTitle: str(fd.get("metaTitle"), 120) || null,
    metaDescription: str(fd.get("metaDescription"), 320) || null,
  };
  const fe: Record<string, string> = {};
  if (data.h1.length < 3) fe.h1 = "Wpisz nagłówek strony (H1).";
  if (data.short.length < 10) fe.short = "Wpisz krótki opis na kafelek (min. 10 znaków).";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };
  const key = `kategoria:${slug}`;
  const prev = await db.pageContent.findUnique({ where: { slug: key } });
  const before = prev ? JSON.parse(prev.data) : categoryDefaults(cat);
  await db.pageContent.upsert({
    where: { slug: key },
    create: { slug: key, kind: "CATEGORY", data: JSON.stringify(data), updatedById: admin.id },
    update: { data: JSON.stringify(data), updatedById: admin.id },
  });
  await audit(admin.id, "PageContent", key, "update", changedFields(before, data));
  revalidatePath(`/${slug}/`);
  revalidatePath("/");
  return { ok: true, message: "Zapisano. Zmiany są już widoczne na stronie." };
}

/* ---------------------------------------------------------------- ustawienia firmy */

export async function saveSiteSettings(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const v = (k: string, max = 200) => str(fd.get(k), max) || null;
  const data: SiteSettings = {
    legalName: v("legalName"),
    nip: v("nip", 20),
    krs: v("krs", 20),
    address: v("address", 300),
    phone: v("phone", 40),
    email: v("email"),
    openingHours: v("openingHours"),
    responseTime: str(fd.get("responseTime"), 100) || SITE_DEFAULTS.responseTime,
    linkedin: v("linkedin", 300),
    facebook: v("facebook", 300),
  };
  const fe: Record<string, string> = {};
  if (data.email && !isValidEmail(data.email)) fe.email = "Wpisz poprawny adres e-mail.";
  for (const k of ["linkedin", "facebook"] as const) if (data[k] && !/^https:\/\//.test(data[k]!)) fe[k] = "Adres musi zaczynać się od https://";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };
  const prev = await db.setting.findUnique({ where: { key: "site" } });
  await db.setting.upsert({ where: { key: "site" }, create: { key: "site", value: JSON.stringify(data) }, update: { value: JSON.stringify(data) } });
  await audit(admin.id, "Setting", "site", "update", changedFields(prev ? JSON.parse(prev.value) : SITE_DEFAULTS, data));
  revalidatePath("/", "layout");
  return { ok: true, message: "Zapisano dane firmy. Zmiany są widoczne w stopce, na stronie kontaktu i w dokumentach." };
}

/* ---------------------------------------------------------------- banery */

async function readBanners(): Promise<Record<string, { mediaId?: string | null; alt?: string; href?: string | null; hidden?: boolean }>> {
  const row = await db.setting.findUnique({ where: { key: "banners" } });
  try {
    return row ? JSON.parse(row.value) : {};
  } catch {
    return {};
  }
}

export async function saveBanner(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const key = str(fd.get("key"), 40) as BannerKey;
  if (!(key in BANNER_DEFAULTS)) return { error: "Nieznany baner." };
  const all = await readBanners();
  const cur = all[key] ?? {};
  const next = { ...cur };
  next.alt = str(fd.get("alt"), 1000) || undefined;
  const href = str(fd.get("href"), 300);
  if (href && !/^(\/|https:\/\/|#)/.test(href)) return { error: "Link musi zaczynać się od / (strona w serwisie) albo https://", fieldErrors: { href: "Np. /portal/wniosek/ lub https://…" } };
  next.href = href || null;
  next.hidden = fd.get("hidden") === "on";
  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    try {
      const img = await saveImage(file);
      const m = await db.media.create({ data: { ...img, alt: next.alt ?? null } });
      next.mediaId = m.id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { file: e.message } };
      throw e;
    }
  }
  all[key] = next;
  await db.setting.upsert({ where: { key: "banners" }, create: { key: "banners", value: JSON.stringify(all) }, update: { value: JSON.stringify(all) } });
  await audit(admin.id, "Setting", `banner:${key}`, "update", changedFields(cur, next));
  revalidatePath("/", "layout");
  return { ok: true, message: "Zapisano baner." };
}

export async function resetBanner(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const key = str(fd.get("key"), 40);
  const all = await readBanners();
  delete all[key];
  await db.setting.upsert({ where: { key: "banners" }, create: { key: "banners", value: JSON.stringify(all) }, update: { value: JSON.stringify(all) } });
  await audit(admin.id, "Setting", `banner:${key}`, "reset");
  revalidatePath("/", "layout");
  redirect("/admin/banery/?przywrocono=1");
}

/* ---------------------------------------------------------------- aktualności */

export async function savePost(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("id"), 40);
  const title = str(fd.get("title"), 200);
  let slug = slugify(str(fd.get("slug"), 120) || title);
  const body = String(fd.get("body") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 100000);
  const status = fd.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const dateRaw = str(fd.get("publishedAt"), 16);
  const fe: Record<string, string> = {};
  if (title.length < 3) fe.title = "Wpisz tytuł wpisu.";
  if (body.length < 20) fe.body = "Treść wpisu jest za krótka.";
  if (!slug) fe.slug = "Podaj adres wpisu (same litery, cyfry i myślniki).";
  if (Object.keys(fe).length) return { error: "Popraw zaznaczone pola.", fieldErrors: fe };
  const clash = await db.post.findFirst({ where: { slug, id: id ? { not: id } : undefined } });
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  let coverId: string | null | undefined;
  const file = fd.get("cover");
  if (file instanceof File && file.size > 0) {
    try {
      const img = await saveImage(file);
      coverId = (await db.media.create({ data: { ...img, alt: str(fd.get("coverAlt"), 300) || null } })).id;
    } catch (e) {
      if (e instanceof UploadError) return { error: e.message, fieldErrors: { cover: e.message } };
      throw e;
    }
  } else if (fd.get("removeCover") === "on") coverId = null;

  const existing = id ? await db.post.findUnique({ where: { id } }) : null;
  const publishedAt =
    status === "PUBLISHED" ? (dateRaw ? new Date(dateRaw) : existing?.publishedAt ?? new Date()) : dateRaw ? new Date(dateRaw) : existing?.publishedAt ?? null;
  const data = {
    title,
    slug,
    body,
    status,
    publishedAt,
    excerpt: str(fd.get("excerpt"), 400) || null,
    metaTitle: str(fd.get("metaTitle"), 120) || null,
    metaDescription: str(fd.get("metaDescription"), 320) || null,
    ...(coverId !== undefined ? { coverId } : {}),
  };
  let postId = id;
  if (existing) {
    await db.post.update({ where: { id }, data });
    if (coverId === undefined && existing.coverId) {
      const alt = str(fd.get("coverAlt"), 300) || null;
      await db.media.update({ where: { id: existing.coverId }, data: { alt } });
    }
    await audit(admin.id, "Post", id, "update", changedFields(existing as unknown as Record<string, unknown>, data));
  } else {
    postId = (await db.post.create({ data: { ...data, authorId: admin.id } })).id;
    await audit(admin.id, "Post", postId, "create");
  }
  revalidatePath("/aktualnosci/");
  revalidatePath(`/aktualnosci/${slug}/`);
  if (existing && existing.slug !== slug) revalidatePath(`/aktualnosci/${existing.slug}/`);
  revalidatePath("/");
  if (!existing) redirect(`/admin/aktualnosci/${postId}/?zapisano=1`);
  return { ok: true, message: status === "PUBLISHED" ? "Zapisano i opublikowano." : "Zapisano szkic (niewidoczny na stronie)." };
}

export async function deletePost(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = str(fd.get("id"), 40);
  const p = await db.post.delete({ where: { id } });
  await audit(admin.id, "Post", id, "delete", { tytul: [p.title, null] });
  revalidatePath("/aktualnosci/");
  revalidatePath(`/aktualnosci/${p.slug}/`);
  revalidatePath("/");
  redirect("/admin/aktualnosci/?usunieto=1");
}
