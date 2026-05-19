import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./lib/auth/AuthProvider";
import "./App.css";

export function AppLayout() {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          IronCore Retain
        </NavLink>
        {auth.isAuthenticated ? (
          <nav>
            <NavLink to="/">Dashboard</NavLink>
            <NavLink to="/members">Members</NavLink>
            <button type="button" onClick={() => void auth.logout()}>
              Sign out
            </button>
          </nav>
        ) : null}
      </header>
      <Outlet />
    </div>
  );
}

export default AppLayout;
