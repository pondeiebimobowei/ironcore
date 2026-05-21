const fallbackSupportEmail = "support@ironcore-retain.local";

export const supportEmail =
  import.meta.env.VITE_SUPPORT_EMAIL ?? fallbackSupportEmail;

export const supportMailto = `mailto:${supportEmail}`;
