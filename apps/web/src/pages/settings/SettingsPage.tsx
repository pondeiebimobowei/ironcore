import { Link } from "react-router-dom";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  generalSettings,
  settingsShortcuts,
} from "../../features/organizations/settings";
import {
  getCurrentOrganization,
  updateOrganizationProfile,
} from "../../features/organizations/api";
import { supportEmail, supportMailto } from "../../lib/support/contact";
import { SettingsNavigation } from "./SettingsNavigation";

type GeneralPreferences = {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
};

const defaultPreferences: GeneralPreferences = {
  timezone: "Africa/Lagos",
  dateFormat: "MMM D, YYYY",
  timeFormat: "12h",
  currency: "NGN",
};

const sideCards = [
  {
    title: "Notification Preferences",
    description: "Choose what notifications you want to receive and how.",
    action: "Manage Notifications",
    path: "/settings/notifications",
    icon: "NT",
    tone: "blue",
  },
  {
    title: "Integrations",
    description: "Connect IronCore Retain with your favorite tools.",
    action: "Manage Integrations",
    path: "/settings/integrations",
    icon: "IN",
    tone: "green",
  },
  {
    title: "Security",
    description: "Manage password, two-factor authentication and sessions.",
    action: "Manage Security",
    path: "/settings/security",
    icon: "SC",
    tone: "yellow",
  },
];

export function SettingsPage() {
  const { organization, updateOrganization } = useAuth();
  const [preferences, setPreferences] = useState<GeneralPreferences>({
    timezone: organization?.timezone ?? defaultPreferences.timezone,
    dateFormat: organization?.dateFormat ?? defaultPreferences.dateFormat,
    timeFormat: organization?.timeFormat ?? defaultPreferences.timeFormat,
    currency: organization?.currency ?? defaultPreferences.currency,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getCurrentOrganization()
      .then((currentOrganization) => {
        if (!active) {
          return;
        }

        setPreferences({
          timezone: currentOrganization.timezone,
          dateFormat: currentOrganization.dateFormat,
          timeFormat: currentOrganization.timeFormat,
          currency: currentOrganization.currency,
        });
        updateOrganization({
          id: currentOrganization.id,
          name: currentOrganization.name,
          slug: currentOrganization.slug,
          timezone: currentOrganization.timezone,
          dateFormat: currentOrganization.dateFormat,
          timeFormat: currentOrganization.timeFormat,
          currency: currentOrganization.currency,
        });
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Could not load general settings.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [updateOrganization]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      setIsSaving(true);
      const currentOrganization = await updateOrganizationProfile(preferences);
      setPreferences({
        timezone: currentOrganization.timezone,
        dateFormat: currentOrganization.dateFormat,
        timeFormat: currentOrganization.timeFormat,
        currency: currentOrganization.currency,
      });
      updateOrganization({
        id: currentOrganization.id,
        name: currentOrganization.name,
        slug: currentOrganization.slug,
        timezone: currentOrganization.timezone,
        dateFormat: currentOrganization.dateFormat,
        timeFormat: currentOrganization.timeFormat,
        currency: currentOrganization.currency,
      });
      setMessage("General settings saved.");
    } catch {
      setError("Could not save general settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page settings-page">
      <header className="page-header settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your gym and account preferences.</p>
        </div>
      </header>

      <SettingsNavigation currentLabel="General" />

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
              <Link to={shortcut.path} className="secondary-button">
                {shortcut.action}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <div className="settings-layout">
        <form className="settings-panel" onSubmit={handleSubmit}>
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
                <select
                  aria-label={setting.label}
                  disabled={isLoading || isSaving}
                  value={preferences[setting.field]}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      ...current,
                      [setting.field]: event.target.value,
                    }))
                  }
                >
                  {setting.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="settings-save-bar">
            <div>
              {message ? <p className="success-text">{message}</p> : null}
              {error ? (
                <p className="danger-text" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <button type="submit" disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>

        <aside className="settings-side" aria-label="Additional settings">
          {sideCards.map((card) => (
            <article
              className="settings-card settings-side-card"
              key={card.title}
            >
              <span
                className={`settings-icon settings-icon-${card.tone}`}
                aria-hidden="true"
              >
                {card.icon}
              </span>
              <div>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
                <Link to={card.path} className="secondary-button">
                  {card.action}
                </Link>
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
