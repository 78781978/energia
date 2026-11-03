import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/site/blocks";
import { PostCard } from "@/components/site/PostCard";
import { listPublishedPosts } from "@/lib/cms";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Aktualności – rynek energii dla firm",
  description: "Aktualności Energia w Biznesie: ceny energii, zmiany w taryfach i przepisach, terminy ważne dla przedsiębiorców.",
  alternates: { canonical: "/aktualnosci/" },
};

export default async function NewsPage() {
  const posts = await listPublishedPosts(100);
  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 32 }}>
        <div className="container">
          <Breadcrumbs items={[{ name: "Aktualności", path: "/aktualnosci/" }]} />
          <span className="eyebrow">Aktualności</span>
          <h1>
            Z rynku energii<span className="dot">.</span>
          </h1>
          <p className="lead">Ceny, taryfy, przepisy i terminy, o których warto pamiętać w firmie.</p>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 32 }}>
        <div className="container">
          {posts.length ? (
            <div className="grid grid-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <p className="muted">Wkrótce opublikujemy tu pierwsze wpisy.</p>
          )}
        </div>
      </section>
    </>
  );
}
