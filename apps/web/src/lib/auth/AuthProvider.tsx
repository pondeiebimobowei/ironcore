import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiClient } from "../api/client";
import { setAccessToken } from "./token-store";

type AuthUser = {
  id: string;
  email: string;
  role: string;
};

type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

type AuthSession = {
  accessToken: string;
  user: AuthUser;
  organization: AuthOrganization;
};

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = LoginInput & {
  organizationName: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  organization: AuthOrganization | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (input: LoginInput) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrganization | null>(
    null,
  );
  const [isInitializing, setIsInitializing] = useState(true);

  const applySession = useCallback((session: AuthSession) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setOrganization(session.organization);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await apiClient.post<AuthSession>("/api/auth/refresh");
      applySession(response.data);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    void refresh().finally(() => setIsInitializing(false));
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      organization,
      isAuthenticated: Boolean(user),
      isInitializing,
      async login(input) {
        const response = await apiClient.post<AuthSession>(
          "/api/auth/login",
          input,
        );
        applySession(response.data);
      },
      async signup(input) {
        const response = await apiClient.post<AuthSession>(
          "/api/auth/signup",
          input,
        );
        applySession(response.data);
      },
      refresh,
      async logout() {
        await apiClient.post("/api/auth/logout").catch(() => undefined);
        clearSession();
      },
    }),
    [applySession, clearSession, isInitializing, organization, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
