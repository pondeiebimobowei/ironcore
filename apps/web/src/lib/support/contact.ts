const fallbackSupportEmail = "support@ironcore.local";

export const supportEmail =
  import.meta.env.VITE_SUPPORT_EMAIL ?? fallbackSupportEmail;

export const supportMailto = `mailto:${supportEmail}`;
