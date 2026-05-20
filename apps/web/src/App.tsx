import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./lib/auth/AuthContext";
import "./App.css";

const navigationItems = [
  { to: "/", label: "Dashboard", icon: "D" },
  { to: "/members", label: "Members", icon: "M" },
  { to: "/recovery", label: "Recovery Queue", icon: "R", badge: "12" },
  { to: "/payments", label: "Payments", icon: "P", badge: "7" },
  { to: "/workflows", label: "Workflows", icon: "W" },
  { to: "/settings", label: "Settings", icon: "S" },
];

export function AppLayout() {
  const auth = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!auth.isAuthenticated) {
    return (
      <div className="app-shell auth-shell">
        <Outlet />
      </div>
    );
  }

  const initials =
    auth.user?.email
      .split("@")[0]
      .split(/[._-]/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "IC";

  return (
    <div className={`app-shell ${isMobileNavOpen ? "nav-open" : ""}`}>
      <aside className="app-sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-mark">IC</span>
          <span>
            <strong>IronCore</strong>
            <small>Retain</small>
          </span>
        </NavLink>
        <nav
          className="sidebar-nav"
          id="primary-navigation"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) => (
            <NavLink
              to={item.to}
              key={item.to}
              end={item.to === "/"}
              onClick={() => setIsMobileNavOpen(false)}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.badge ? <strong>{item.badge}</strong> : null}
            </NavLink>
          ))}
        </nav>
        <div className="plan-card">
          <span>Your Plan</span>
          <strong>Pilot</strong>
          <div className="plan-card-row">
            <span>Members</span>
            <b>248 / 500</b>
          </div>
          <div className="plan-progress" aria-hidden="true">
            <span />
          </div>
          <button type="button">Upgrade Plan</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            type="button"
            aria-expanded={isMobileNavOpen}
            aria-controls="primary-navigation"
            onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
          >
            Menu
          </button>
          <label className="global-search">
            <span aria-hidden="true">/</span>
            <input placeholder="Search members by name or phone..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Alerts">
              !
              <span>7</span>
            </button>
            <div className="user-menu">
              <span>{initials}</span>
              <div>
                <strong>{auth.user?.email.split("@")[0] ?? "User"}</strong>
                <small>{auth.organization?.name ?? "IronCore"}</small>
              </div>
            </div>
            <button type="button" onClick={() => void auth.logout()}>
              Sign out
            </button>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}

export default AppLayout;
