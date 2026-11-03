import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, RichBody } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/JsonLd";
import { fmtPostDate } from "@/components/site/PostCard";
import { Icon } from "@/components/Icon";
import { getPublishedPost } from "@/lib/cms";
import { mediaUrl } from "@/lib/storage";
import { plain } from "@/lib/markdown";
import { SITE } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return {};
  const description = post.metaDescription ?? post.excerpt ?? plain(post.body).slice(0, 160);
  return {
    title: post.metaTitle ?? post.title,
    description,
    alternates: { canonical: `/aktualnosci/${post.slug}/` },
    openGraph: { type: "article", title: post.title, description, images: post.cover ? [mediaUrl(post.cover.storedName)] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 32 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <Breadcrumbs items={[{ name: "Aktualności", path: "/aktualnosci/" }, { name: post.title, path: `/aktualnosci/${post.slug}/` }]} />
          <time className="eyebrow" dateTime={post.publishedAt?.toISOString()}>
            {fmtPostDate(post.publishedAt)}
          </time>
          <h1>{post.title}</h1>
          {post.excerpt && <p className="lead">{post.excerpt}</p>}
        </div>
      </section>
      <section className="section section--white" style={{ paddingTop: 48 }}>
        <div className="container" style={{ maxWidth: 880 }}>
          {post.cover && (
            <img
              src={mediaUrl(post.cover.storedName)}
              alt={post.cover.alt ?? ""}
              width={post.cover.width ?? 1200}
              height={post.cover.height ?? 800}
              style={{ width: "100%", height: "auto", borderRadius: 20, marginBottom: 40 }}
            />
          )}
          <RichBody body={post.body} />
          <p style={{ marginTop: 48 }}>
            <Link href="/aktualnosci/" className="link-arrow">
              <Icon name="arrowLeft" size={18} /> Wszystkie aktualności
            </Link>
          </p>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          image: post.cover ? `${SITE.url}${mediaUrl(post.cover.storedName)}` : undefined,
          publisher: { "@id": `${SITE.url}/#organizacja` },
          mainEntityOfPage: `${SITE.url}/aktualnosci/${post.slug}/`,
        }}
      />
    </>
  );
}
