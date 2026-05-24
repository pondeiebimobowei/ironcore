import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";

type OrganizationPreferences = {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  currency?: string;
};

const defaultPreferences = {
  timezone: "Africa/Lagos",
  dateFormat: "MMM D, YYYY",
  timeFormat: "12h",
  currency: "NGN",
};

const currencyLocales: Record<string, string> = {
  EUR: "en-IE",
  GBP: "en-GB",
  GHS: "en-GH",
  KES: "en-KE",
  NGN: "en-NG",
  USD: "en-US",
  ZAR: "en-ZA",
};

export function formatOrganizationCurrency(
  value: number | string | null | undefined,
  currency = defaultPreferences.currency,
) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat(currencyLocales[currency] ?? "en", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatOrganizationDate(
  value: string | Date | null | undefined,
  preferences: OrganizationPreferences = defaultPreferences,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const timezone = preferences.timezone ?? defaultPreferences.timezone;
  const dateFormat = preferences.dateFormat ?? defaultPreferences.dateFormat;

  if (dateFormat === "YYYY-MM-DD") {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(date);
  }

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );

  if (dateFormat === "DD/MM/YYYY") {
    return `${parts.day}/${parts.month}/${parts.year}`;
  }

  if (dateFormat === "MM/DD/YYYY") {
    return `${parts.month}/${parts.day}/${parts.year}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  }).format(date);
}

export function formatOrganizationDateTime(
  value: string | Date | null | undefined,
  preferences: OrganizationPreferences = defaultPreferences,
) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const timezone = preferences.timezone ?? defaultPreferences.timezone;
  const hour12 =
    (preferences.timeFormat ?? defaultPreferences.timeFormat) === "12h";
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    hour12,
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);

  return `${formatOrganizationDate(date, preferences)} ${time}`;
}

export function useOrganizationFormatters() {
  const { organization } = useAuth();

  return useMemo(() => {
    const preferences = {
      timezone: organization?.timezone ?? defaultPreferences.timezone,
      dateFormat: organization?.dateFormat ?? defaultPreferences.dateFormat,
      timeFormat: organization?.timeFormat ?? defaultPreferences.timeFormat,
      currency: organization?.currency ?? defaultPreferences.currency,
    };

    return {
      currency: preferences.currency,
      formatCurrency(value: number | string | null | undefined) {
        return formatOrganizationCurrency(value, preferences.currency);
      },
      formatDate(value: string | Date | null | undefined) {
        return formatOrganizationDate(value, preferences);
      },
      formatDateTime(value: string | Date | null | undefined) {
        return formatOrganizationDateTime(value, preferences);
      },
      preferences,
    };
  }, [
    organization?.currency,
    organization?.dateFormat,
    organization?.timeFormat,
    organization?.timezone,
  ]);
}
