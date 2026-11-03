import Link from "next/link";
import { requireClient } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocList, PageHead, StatusBadge, StatusProgress, fmtDate, fmtDateTime } from "@/components/app/ui";
import { Icon } from "@/components/Icon";
import { MEDIA, STATUS_HELP, type AppStatus } from "@/lib/constants";
import { markMessagesRead } from "@/app/actions/portal";
import { PortalEnquiry } from "@/components/app/PortalEnquiry";
import type { IconName } from "@/components/Icon";

export const metadata = { title: "Pulpit" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ zapytanie?: string }> }) {
  const user = await requireClient();
  const sp = await searchParams;
  const [apps, docs, messages, pointsCount, contractsCount, postsCount] = await Promise.all([
    db.application.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { company: true } }),
    db.document.findMany({
      where: { visibleToClient: true, OR: [{ application: { userId: user.id } }, { company: { ownerId: user.id } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { uploadedBy: { select: { role: true } } },
    }),
    db.message.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: "desc" }, take: 5, include: { application: { select: { number: true } } } }),
    db.meteringPoint.count({ where: { company: { ownerId: user.id } } }),
    db.document.count({ where: { visibleToClient: true, kind: { in: ["UMOWA", "UMOWA_PODPISANA"] }, application: { userId: user.id } } }),
    db.post.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
  ]);
  const hasInvoice = docs.some((d) => d.kind === "FAKTURA") || (await db.document.count({ where: { kind: "FAKTURA", application: { userId: user.id } } })) > 0;
  const chosen = await db.offerAssignment.count({ where: { status: "WYBRANA", application: { userId: user.id } } });
  const signed = apps.some((a) => ["PODPISANA", "WYSLANA_DO_OPERATORA", "AKTYWOWANA"].includes(a.status));
  const guide = [
    { label: "Zarejestruj profil firmy", done: true },
    { label: "Potwierdź adres e-mail", done: Boolean(user.emailVerifiedAt) },
    { label: "Złóż zamówienie w generatorze ofert", done: apps.length > 0, href: "/portal/wniosek/" },
    { label: "Dodaj faktury i dane liczników", done: hasInvoice || pointsCount > 0, href: "/portal/liczniki/" },
    { label: "Wybierz najlepszą ofertę", done: chosen > 0, href: apps[0] ? `/portal/wnioski/${apps[0].id}/` : undefined },
    { label: "Podpisz umowę online", done: signed },
  ];
  const tiles: { href: string; icon: IconName; title: string; text: string; count?: number }[] = [
    { href: "/portal/wniosek/", icon: "plus", title: "Generator ofert", text: "Nowe zamówienie prądu lub gazu – oferty w kilka minut." },
    { href: "/portal/wnioski/", icon: "list", title: "Zamówienia", text: "Statusy zamówień i propozycje ofert.", count: apps.length },
    { href: "/portal/dokumenty/", icon: "file", title: "Umowy", text: "Umowy do podpisu, podpisane umowy i dokumenty.", count: contractsCount },
    { href: "/portal/liczniki/", icon: "bolt", title: "Liczniki i umowy", text: "Wszystkie PPE/PPG, terminy umów i oszczędności.", count: pointsCount },
    { href: "/aktualnosci/", icon: "chart", title: "Informacje z rynku", text: "Aktualności i zmiany na rynku energii.", count: postsCount || undefined },
    { href: "/portal/?zapytanie=ROZMOWA#zapytanie", icon: "phone", title: "Kontakt z ekspertem", text: "Zadaj pytanie lub zamów rozmowę z doradcą." },
  ];
  const current = apps.find((a) => !["AKTYWOWANA", "ODRZUCONA"].includes(a.status)) ?? apps[0];
  const unread = messages.some((m) => !m.readAt);

  return (
    <>
      <PageHead
        title="Witaj w Portalu Klienta Biznesowego"
        sub={`${user.name ? `${user.name.split(" ")[0]}, t` : "T"}u zamówisz energię i gaz, porównasz oferty, podpiszesz umowę i sprawdzisz terminy liczników.`}
        actions={
          <Link className="btn" href="/portal/wniosek/">
            <Icon name="plus" size={18} /> Nowe zamówienie
          </Link>
        }
      />

      <div className="tile-grid" style={{ marginBottom: 24 }}>
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="tile">
            <span style={{ display: "flex", alignItems: "center" }}>
              <span className="tile__icon">
                <Icon name={t.icon} size={22} />
              </span>
              {!!t.count && <span className="badge badge--plain tile__count">{t.count}</span>}
            </span>
            <strong>{t.title}</strong>
            <small>{t.text}</small>
          </Link>
        ))}
      </div>

      <div className="two-col" style={{ marginBottom: 24 }}>
        <section className="panel" aria-labelledby="zamow">
          <div className="panel__head">
            <h2 id="zamow">Nowe zamówienie</h2>
          </div>
          <div className="order-grid">
            <Link className="order-btn" href="/portal/wniosek/?media=PRAD">
              <span className="tile__icon">
                <Icon name="bolt" size={22} />
              </span>
              Energia elektryczna
            </Link>
            <Link className="order-btn" href="/portal/wniosek/?media=GAZ">
              <span className="tile__icon">
                <Icon name="flame" size={22} />
              </span>
              Gaz ziemny
            </Link>
            <Link className="order-btn" href="/portal/?zapytanie=PRODUKT_TECHNICZNY#zapytanie">
              <span className="tile__icon">
                <Icon name="wrench" size={22} />
              </span>
              Produkt techniczny
            </Link>
            <Link className="order-btn" href="/portal/?zapytanie=POMOC_PRAWNA#zapytanie">
              <span className="tile__icon">
                <Icon name="scale" size={22} />
              </span>
              Pomoc prawna
            </Link>
          </div>
        </section>
        <section className="panel" aria-labelledby="przewodnik">
          <div className="panel__head">
            <h2 id="przewodnik">Jak zacząć – przewodnik</h2>
            <span className="small muted">
              {guide.filter((g) => g.done).length}/{guide.length}
            </span>
          </div>
          <ol className="guide-steps">
            {guide.map((g) => (
              <li key={g.label} data-done={g.done}>
                {g.href && !g.done ? <Link href={g.href}>{g.label}</Link> : <span className={g.done ? "muted" : undefined}>{g.label}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {!current ? (
        <div className="panel empty">
          <img src="/img/3d/porownanie.png" alt="" width={200} height={123} />
          <h3>Nie masz jeszcze żadnego zamówienia</h3>
          <p>Uruchom generator ofert dla prądu lub gazu – zajmie to kilka minut. Wystarczy faktura.</p>
          <Link className="btn btn--lg" href="/portal/wniosek/">
            Generator ofert <Icon name="arrowRight" size={18} className="arrow" />
          </Link>
        </div>
      ) : (
        <div className="two-col">
          <div className="stack">
            <section className="panel" aria-labelledby="biezacy">
              <div className="panel__head">
                <h2 id="biezacy">
                  Wniosek {current.number}{" "}
                  <span className="muted small" style={{ fontWeight: 400 }}>
                    · {current.company.name} · {MEDIA[current.media as keyof typeof MEDIA]}
                  </span>
                </h2>
                <StatusBadge status={current.status} />
              </div>
              <StatusProgress status={current.status} />
              <div className={`alert ${current.status === "OCZEKUJE_NA_PODPIS" ? "alert--warn" : ""}`}>
                <Icon name={current.status === "OCZEKUJE_NA_PODPIS" ? "alert" : "info"} />
                <p>{STATUS_HELP[current.status as AppStatus]}</p>
              </div>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <Link className="btn" href={`/portal/wnioski/${current.id}/`}>
                  {current.status === "OCZEKUJE_NA_PODPIS" ? "Podpisz umowę" : "Szczegóły wniosku"} <Icon name="arrowRight" size={18} className="arrow" />
                </Link>
              </div>
            </section>

            <section className="panel" aria-labelledby="ostatnie-dok">
              <div className="panel__head">
                <h2 id="ostatnie-dok">Ostatnie dokumenty</h2>
                <Link href="/portal/dokumenty/" className="small">
                  Wszystkie dokumenty
                </Link>
              </div>
              <DocList docs={docs} />
            </section>
          </div>

          <div className="stack">
            <section className="panel" aria-labelledby="komunikaty">
              <div className="panel__head">
                <h2 id="komunikaty">Komunikaty od doradcy</h2>
                {unread && (
                  <form action={markMessagesRead}>
                    <button className="btn btn--ghost btn--sm" type="submit">
                      Oznacz jako przeczytane
                    </button>
                  </form>
                )}
              </div>
              {messages.length ? (
                <div className="stack" style={{ gap: 10 }}>
                  {messages.map((m) => (
                    <div key={m.id} className={`message ${m.readAt ? "" : "message--unread"}`}>
                      <div className="message__meta">
                        {fmtDateTime(m.createdAt)}
                        {m.application && ` · wniosek ${m.application.number}`}
                      </div>
                      {m.body}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted small">Brak komunikatów. O ważnych zmianach poinformujemy Cię tutaj i e-mailem.</p>
              )}
            </section>
            {apps.length > 1 && (
              <section className="panel">
                <div className="panel__head">
                  <h2>Pozostałe wnioski</h2>
                </div>
                <ul className="side-list">
                  {apps
                    .filter((a) => a.id !== current.id)
                    .slice(0, 5)
                    .map((a) => (
                      <li key={a.id}>
                        <Link href={`/portal/wnioski/${a.id}/`} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span>
                            {a.number} <span className="muted small">· {fmtDate(a.createdAt)}</span>
                          </span>
                          <StatusBadge status={a.status} />
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
      <section className="panel" id="zapytanie" aria-labelledby="zapytanie-h" style={{ marginTop: 24, scrollMarginTop: 24 }}>
        <div className="panel__head">
          <h2 id="zapytanie-h">Kontakt z ekspertem</h2>
          <span className="small muted">Odpowiadamy w ciągu jednego dnia roboczego</span>
        </div>
        <PortalEnquiry key={sp.zapytanie ?? "x"} initialType={sp.zapytanie ?? "ROZMOWA"} />
      </section>
    </>
  );
}
