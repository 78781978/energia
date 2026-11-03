import Link from "next/link";
import { mediaUrl } from "@/lib/storage";

type P = {
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: Date | null;
  cover: { storedName: string; width: number | null; height: number | null; alt: string | null } | null;
};

export const fmtPostDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(d) : "";

export function PostCard({ post }: { post: P }) {
  return (
    <Link href={`/aktualnosci/${post.slug}/`} className="cat-card post-card">
      {post.cover && (
        <div className="post-card__img">
          <img src={mediaUrl(post.cover.storedName)} alt={post.cover.alt ?? ""} width={post.cover.width ?? 1200} height={post.cover.height ?? 800} loading="lazy" />
        </div>
      )}
      <div className="cat-card__body">
        <time className="muted small" dateTime={post.publishedAt?.toISOString()}>
          {fmtPostDate(post.publishedAt)}
        </time>
        <h3 className="cat-card__title">{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
        <span className="cat-card__more">Czytaj dalej →</span>
      </div>
    </Link>
  );
}
