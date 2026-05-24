export type SettingsTab =
  | "General"
  | "Organisation"
  | "Billing & Plan"
  | "Users & Permissions"
  | "Notifications"
  | "Integrations"
  | "Security"
  | "Audit Log";

export type SettingsShortcut = {
  title: string;
  description: string;
  action: string;
  path: string;
  tone: "danger" | "success" | "accent";
  icon: string;
};

export type SettingsNavigationItem = {
  label: SettingsTab;
  path: string;
};

export type GeneralSetting = {
  field: "timezone" | "dateFormat" | "timeFormat" | "currency";
  label: string;
  description: string;
  icon: string;
  tone: "blue" | "yellow" | "purple" | "green";
  options: Array<{
    label: string;
    value: string;
  }>;
};

export const settingsTabs: SettingsTab[] = [
  "General",
  "Organisation",
  "Billing & Plan",
  "Users & Permissions",
  "Notifications",
  "Integrations",
  "Security",
  "Audit Log",
];

export const settingsNavigation: SettingsNavigationItem[] = [
  { label: "General", path: "/settings" },
  { label: "Organisation", path: "/settings/organization" },
  { label: "Billing & Plan", path: "/settings/billing" },
  { label: "Users & Permissions", path: "/settings/users" },
  { label: "Notifications", path: "/settings/notifications" },
  { label: "Integrations", path: "/settings/integrations" },
  { label: "Security", path: "/settings/security" },
  { label: "Audit Log", path: "/settings/audit-log" },
];

export const settingsShortcuts: SettingsShortcut[] = [
  {
    title: "Organisation Profile",
    description:
      "Update your organisation information, contact details and branding.",
    action: "Manage Profile",
    path: "/settings/organization",
    tone: "danger",
    icon: "GP",
  },
  {
    title: "Billing & Plan",
    description: "View your current plan, billing history and payment methods.",
    action: "Manage Billing",
    path: "/settings/billing",
    tone: "success",
    icon: "BP",
  },
  {
    title: "Users & Permissions",
    description: "Manage team members, roles and access permissions.",
    action: "Manage Users",
    path: "/settings/users",
    tone: "accent",
    icon: "UP",
  },
];

export const generalSettings: GeneralSetting[] = [
  {
    field: "timezone",
    label: "Timezone",
    description: "Set the workspace timezone used for operational dates.",
    icon: "TZ",
    tone: "blue",
    options: [
      { label: "(GMT+01:00) Lagos", value: "Africa/Lagos" },
      { label: "(GMT+00:00) UTC", value: "UTC" },
      { label: "(GMT+00:00/+01:00) London", value: "Europe/London" },
      { label: "(GMT-05:00/-04:00) New York", value: "America/New_York" },
      { label: "(GMT+00:00) Accra", value: "Africa/Accra" },
      { label: "(GMT+03:00) Nairobi", value: "Africa/Nairobi" },
      { label: "(GMT+02:00) Johannesburg", value: "Africa/Johannesburg" },
    ],
  },
  {
    field: "dateFormat",
    label: "Date Format",
    description: "Choose the date format to use across the platform.",
    icon: "DF",
    tone: "yellow",
    options: [
      { label: "May 5, 2025 (MMM D, YYYY)", value: "MMM D, YYYY" },
      { label: "05/05/2025 (DD/MM/YYYY)", value: "DD/MM/YYYY" },
      { label: "05/05/2025 (MM/DD/YYYY)", value: "MM/DD/YYYY" },
      { label: "2025-05-05 (YYYY-MM-DD)", value: "YYYY-MM-DD" },
    ],
  },
  {
    field: "timeFormat",
    label: "Time Format",
    description: "Choose between 12-hour or 24-hour time format.",
    icon: "TF",
    tone: "purple",
    options: [
      { label: "12-hour (AM/PM)", value: "12h" },
      { label: "24-hour", value: "24h" },
    ],
  },
  {
    field: "currency",
    label: "Currency",
    description: "Select the default workspace currency.",
    icon: "NG",
    tone: "green",
    options: [
      { label: "NGN (Nigerian Naira)", value: "NGN" },
      { label: "USD (US Dollar)", value: "USD" },
      { label: "GBP (British Pound)", value: "GBP" },
      { label: "EUR (Euro)", value: "EUR" },
      { label: "GHS (Ghanaian Cedi)", value: "GHS" },
      { label: "KES (Kenyan Shilling)", value: "KES" },
      { label: "ZAR (South African Rand)", value: "ZAR" },
    ],
  },
];
