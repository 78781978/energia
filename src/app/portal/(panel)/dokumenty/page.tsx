import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead } from "@/components/app/ui";

export const metadata = { title: "Dokumenty" };

export default async function DocumentsPage() {
  const user = await requireClient();
  const apps = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { documents: { where: { visibleToClient: true }, orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { role: true } } } } },
  });
  const contracts = apps.flatMap((a) => a.documents.filter((d) => d.kind === "UMOWA" || d.kind === "UMOWA_PODPISANA"));
  return (
    <>
      <PageHead title="Dokumenty" sub="Umowy PDF, załączniki i pełna historia dokumentów." />
      <div className="stack">
        <section className="panel">
          <div className="panel__head">
            <h2>Umowy</h2>
          </div>
          <DocList docs={contracts} empty="Umowy pojawią się tutaj, gdy doradca je udostępni." />
        </section>
        {apps.map((a) => (
          <section key={a.id} className="panel">
            <div className="panel__head">
              <h2>
                Wniosek <Link href={`/portal/wnioski/${a.id}/`}>{a.number}</Link>
              </h2>
              <span className="muted small">{a.documents.length} dokumentów</span>
            </div>
            <DocList docs={a.documents} />
          </section>
        ))}
        {!apps.length && (
          <div className="panel empty">
            <h3>Brak dokumentów</h3>
            <p>Dokumenty pojawią się po złożeniu wniosku.</p>
          </div>
        )}
      </div>
    </>
  );
}
