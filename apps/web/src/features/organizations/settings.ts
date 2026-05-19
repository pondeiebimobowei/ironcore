export type SettingsTab =
  | "General"
  | "Gym Profile"
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
  tone: "danger" | "success" | "accent";
  icon: string;
};

export type GeneralSetting = {
  label: string;
  description: string;
  value: string;
  icon: string;
  tone: "blue" | "yellow" | "purple" | "green" | "red";
  action?: string;
};

export const settingsTabs: SettingsTab[] = [
  "General",
  "Gym Profile",
  "Billing & Plan",
  "Users & Permissions",
  "Notifications",
  "Integrations",
  "Security",
  "Audit Log",
];

export const settingsShortcuts: SettingsShortcut[] = [
  {
    title: "Gym Profile",
    description: "Update your gym information, contact details and branding.",
    action: "Manage Profile",
    tone: "danger",
    icon: "GP",
  },
  {
    title: "Billing & Plan",
    description: "View your current plan, billing history and payment methods.",
    action: "Manage Billing",
    tone: "success",
    icon: "BP",
  },
  {
    title: "Users & Permissions",
    description: "Manage team members, roles and access permissions.",
    action: "Manage Users",
    tone: "accent",
    icon: "UP",
  },
];

export const generalSettings: GeneralSetting[] = [
  {
    label: "Timezone",
    description: "Set the timezone for your gym.",
    value: "(GMT+01:00) Lagos",
    icon: "TZ",
    tone: "blue",
  },
  {
    label: "Date Format",
    description: "Choose the date format to use across the platform.",
    value: "May 5, 2025 (MMM D, YYYY)",
    icon: "DF",
    tone: "yellow",
  },
  {
    label: "Time Format",
    description: "Choose between 12-hour or 24-hour time format.",
    value: "12-hour (AM/PM)",
    icon: "TF",
    tone: "purple",
  },
  {
    label: "Currency",
    description: "Select your preferred currency.",
    value: "NGN (₦) - Nigerian Naira",
    icon: "NG",
    tone: "green",
  },
  {
    label: "Tax Settings",
    description: "Manage your tax rates and configuration.",
    value: "Configure",
    icon: "TX",
    tone: "red",
    action: "Configure",
  },
];
