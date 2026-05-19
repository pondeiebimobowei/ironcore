import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";

export function DashboardPage() {
  const { organization } = useAuth();

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>{organization?.name ?? "Dashboard"}</h1>
          <p>Revenue recovery workspace</p>
        </div>
        <Link to="/members" className="button-link">
          Manage members
        </Link>
      </header>
      <section className="dashboard-grid">
        <div className="metric">
          <span>Current focus</span>
          <strong>Member recovery</strong>
        </div>
        <div className="metric">
          <span>Next action</span>
          <strong>Import or review members</strong>
        </div>
        <div className="metric">
          <span>Protected area</span>
          <strong>JWT required</strong>
        </div>
      </section>
    </main>
  );
}
