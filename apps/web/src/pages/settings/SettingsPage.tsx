import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  generalSettings,
  settingsShortcuts,
  settingsTabs,
} from "../../features/organizations/settings";
import { supportEmail, supportMailto } from "../../lib/support/contact";

const sideCards = [
  {
    title: "Notification Preferences",
    description: "Choose what notifications you want to receive and how.",
    action: "Manage Notifications",
    icon: "NT",
    tone: "blue",
  },
  {
    title: "Integrations",
    description: "Connect IronCore Retain with your favorite tools.",
    action: "Manage Integrations",
    icon: "IN",
    tone: "green",
  },
  {
    title: "Security",
    description: "Manage password, two-factor authentication and sessions.",
    action: "Manage Security",
    icon: "SC",
    tone: "yellow",
  },
];

export function SettingsPage() {
  const { organization } = useAuth();

  return (
    <main className="page settings-page">
      <header className="page-header settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your gym and account preferences.</p>
        </div>
      </header>

      <nav className="settings-tabs" aria-label="Settings sections">
        {settingsTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === "General" ? "active" : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="settings-shortcuts" aria-label="Settings shortcuts">
        {settingsShortcuts.map((shortcut) => (
          <article className="settings-card" key={shortcut.title}>
            <span
              className={`settings-icon settings-icon-${shortcut.tone}`}
              aria-hidden="true"
            >
              {shortcut.icon}
            </span>
            <div>
              <h2>{shortcut.title}</h2>
              <p>{shortcut.description}</p>
              {shortcut.title === "Gym Profile" ? (
                <Link to="/settings/organization" className="secondary-button">
                  {shortcut.action}
                </Link>
              ) : shortcut.title === "Billing & Plan" ? (
                <Link to="/settings/billing" className="secondary-button">
                  {shortcut.action}
                </Link>
              ) : (
                <button type="button" className="secondary-button">
                  {shortcut.action}
                </button>
              )}
            </div>
          </article>
        ))}
      </section>

      <div className="settings-layout">
        <section className="settings-panel">
          <header>
            <h2>General Settings</h2>
            <p>{organization?.name ?? "Your gym"} workspace defaults.</p>
          </header>
          <div className="settings-list">
            {generalSettings.map((setting) => (
              <div className="settings-row" key={setting.label}>
                <span
                  className={`settings-icon settings-icon-${setting.tone}`}
                  aria-hidden="true"
                >
                  {setting.icon}
                </span>
                <div>
                  <strong>{setting.label}</strong>
                  <span>{setting.description}</span>
                </div>
                {setting.action ? (
                  <button type="button" className="secondary-button">
                    {setting.action}
                  </button>
                ) : (
                  <select defaultValue={setting.value} aria-label={setting.label}>
                    <option>{setting.value}</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </section>

        <aside className="settings-side" aria-label="Additional settings">
          {sideCards.map((card) => (
            <article className="settings-card settings-side-card" key={card.title}>
              <span
                className={`settings-icon settings-icon-${card.tone}`}
                aria-hidden="true"
              >
                {card.icon}
              </span>
              <div>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                <button type="button" className="secondary-button">
                  {card.action}
                </button>
              </div>
            </article>
          ))}
        </aside>
      </div>

      <section className="settings-export">
        <div>
          <h2>Support</h2>
          <p>{supportEmail}</p>
        </div>
        <a href={supportMailto} className="secondary-button">
          Contact Support
        </a>
      </section>
    </main>
  );
}
