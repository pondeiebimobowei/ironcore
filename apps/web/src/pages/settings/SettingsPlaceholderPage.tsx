import { Link } from "react-router-dom";
import { SettingsNavigation } from "./SettingsNavigation";
import { useAuth } from "../../lib/auth/AuthContext";
import type { SettingsTab } from "../../features/organizations/settings";

type PlaceholderKey =
  | "users"
  | "notifications"
  | "integrations"
  | "security"
  | "audit-log";

type PlaceholderContent = {
  label: SettingsTab;
  title: string;
  description: string;
  icon: string;
  tone: "blue" | "yellow" | "purple" | "green" | "red";
  rows: Array<{
    label: string;
    value: string;
  }>;
};

const placeholders: Record<PlaceholderKey, PlaceholderContent> = {
  users: {
    label: "Users & Permissions",
    title: "Users & Permissions",
    description: "Invite teammates and manage role access from here.",
    icon: "UP",
    tone: "purple",
    rows: [
      { label: "Owner access", value: "Enabled for the current workspace" },
      { label: "Team invitations", value: "Manual invite flow pending" },
      { label: "Roles", value: "Owner, Admin, Operator" },
    ],
  },
  notifications: {
    label: "Notifications",
    title: "Notifications",
    description: "Choose which recovery and payment updates your team receives.",
    icon: "NT",
    tone: "blue",
    rows: [
      { label: "Recovery alerts", value: "Daily summary placeholder" },
      { label: "Payment proof alerts", value: "Enabled in product flow" },
      { label: "Channel", value: "Email settings pending" },
    ],
  },
  integrations: {
    label: "Integrations",
    title: "Integrations",
    description: "Review connected tools and MVP integration status.",
    icon: "IN",
    tone: "green",
    rows: [
      { label: "WhatsApp", value: "Mock provider active" },
      { label: "Payments", value: "Manual verification only" },
      { label: "Exports", value: "CSV support pending" },
    ],
  },
  security: {
    label: "Security",
    title: "Security",
    description: "Account security basics for the current MVP workspace.",
    icon: "SC",
    tone: "yellow",
    rows: [
      { label: "Password", value: "Managed through account login" },
      { label: "Two-factor authentication", value: "Not available in MVP" },
      { label: "Active sessions", value: "Current session only" },
    ],
  },
  "audit-log": {
    label: "Audit Log",
    title: "Audit Log",
    description: "Track important workspace changes and recovery actions.",
    icon: "AL",
    tone: "red",
    rows: [
      { label: "Profile changes", value: "Timeline placeholder" },
      { label: "Payment decisions", value: "Visible in payment details" },
      { label: "Workflow changes", value: "Workflow activity pending" },
    ],
  },
};

type SettingsPlaceholderPageProps = {
  section: PlaceholderKey;
};

export function SettingsPlaceholderPage({
  section,
}: SettingsPlaceholderPageProps) {
  const { organization, user } = useAuth();
  const content = placeholders[section];

  return (
    <main className="page settings-page">
      <header className="page-header settings-header">
        <div>
          <div className="breadcrumb">
            <Link to="/settings">Settings</Link>
            <span>/</span>
            <span>{content.label}</span>
          </div>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
      </header>

      <SettingsNavigation currentLabel={content.label} />

      <section className="settings-panel settings-placeholder-panel">
        <header>
          <span
            className={`settings-icon settings-icon-${content.tone}`}
            aria-hidden="true"
          >
            {content.icon}
          </span>
          <div>
            <h2>{content.title}</h2>
            <p>
              {organization?.name ?? "Your workspace"} can use this screen once
              the full settings workflow is added.
            </p>
          </div>
        </header>
        <div className="settings-list">
          {content.rows.map((row) => (
            <div className="settings-row settings-placeholder-row" key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.value}</span>
              </div>
            </div>
          ))}
          <div className="settings-row settings-placeholder-row">
            <div>
              <strong>Signed in account</strong>
              <span>{user?.email ?? "Account details unavailable"}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
