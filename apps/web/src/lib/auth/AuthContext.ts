import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string | null;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
  organization: AuthOrganization | null;
  onboardingRequired: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  fullName: string;
};

export type OrganizationSetupInput = {
  name: string;
  tagline?: string;
  description?: string;
  establishedYear?: number;
  businessType?: string;
  organizationSize?: string;
  websiteUrl?: string;
  contactEmail?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  businessHours?: unknown[];
  closedOnPublicHolidays?: boolean;
  logoUrl?: string;
  imageUrls?: string[];
};

export type AuthContextValue = {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isAuthenticated: boolean;
  onboardingRequired: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  signup: (input: SignupInput) => Promise<AuthSession>;
  setupOrganization: (input: OrganizationSetupInput) => Promise<AuthSession>;
  updateOrganization: (organization: AuthOrganization) => void;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
