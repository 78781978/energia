import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="container" style={{ textAlign: "center", maxWidth: 640 }}>
        <img src="/img/3d/brak-ofert.png" alt="" width={220} height={196} style={{ width: 220, margin: "0 auto 24px" }} />
        <h1>
          Nie znaleźliśmy tej strony<span className="dot">.</span>
        </h1>
        <p className="lead" style={{ margin: "0 auto 32px" }}>
          Adres mógł się zmienić. Wróć na stronę główną albo przejdź do portalu.
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <Link className="btn btn--lg" href="/">
            Strona główna
          </Link>
          <Link className="btn btn--lg btn--ghost" href="/portal/">
            Portal klienta
          </Link>
        </div>
      </div>
    </main>
  );
}
