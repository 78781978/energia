import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHead, fmtDateTime } from "@/components/app/ui";
import { NewAdminForm } from "@/components/app/AdminForms";
import { toggleUserActive } from "@/app/actions/admin";

export const metadata = { title: "Zespół" };

export default async function Team() {
  const me = await requireAdmin();
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHead title="Zespół" sub="Konta administratorów i doradców z dostępem do panelu." />
      <div className="two-col">
        <div className="panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Konto</th>
                <th>Ostatnie logowanie</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.name ?? a.email}</strong>
                    <div className="muted small">
                      {a.email} {!a.isActive && "· zablokowane"}
                    </div>
                  </td>
                  <td>{fmtDateTime(a.lastLoginAt)}</td>
                  <td>
                    {a.id !== me.id && (
                      <form action={toggleUserActive}>
                        <input type="hidden" name="userId" value={a.id} />
                        <button className="btn btn--ghost btn--sm" type="submit">
                          {a.isActive ? "Zablokuj" : "Odblokuj"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel__head">
            <h2>Dodaj administratora</h2>
          </div>
          <NewAdminForm />
          <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
            Przekaż hasło startowe bezpiecznym kanałem i poproś o jego zmianę („Nie pamiętasz hasła?” na ekranie logowania).
          </p>
        </div>
      </div>
    </>
  );
}
