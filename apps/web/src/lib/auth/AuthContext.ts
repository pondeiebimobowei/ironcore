import { createContext, useContext } from "react";

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
  organization: AuthOrganization;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = LoginInput & {
  organizationName: string;
};

export type AuthContextValue = {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
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
