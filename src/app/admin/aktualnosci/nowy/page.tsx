import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { PageHead } from "@/components/app/ui";
import { PostForm } from "@/components/app/CmsForms";

export const metadata = { title: "Nowy wpis" };

export default async function NewPost() {
  await requireAdmin();
  return (
    <>
      <p className="small" style={{ marginBottom: 8 }}>
        <Link href="/admin/aktualnosci/">← Aktualności</Link>
      </p>
      <PageHead title="Nowy wpis" />
      <PostForm data={{ title: "", slug: "", excerpt: "", body: "", status: "DRAFT", publishedAt: "", metaTitle: null, metaDescription: null, cover: null }} />
    </>
  );
}
