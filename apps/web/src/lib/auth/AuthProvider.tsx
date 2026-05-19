import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "../api/client";
import { AuthContext } from "./AuthContext";
import type {
  AuthContextValue,
  AuthOrganization,
  AuthSession,
  AuthUser,
} from "./AuthContext";
import { setAccessToken } from "./token-store";

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

  const updateOrganization = useCallback((nextOrganization: AuthOrganization) => {
    setOrganization(nextOrganization);
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
    const timeoutId = window.setTimeout(() => {
      void refresh().finally(() => setIsInitializing(false));
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
      updateOrganization,
      refresh,
      async logout() {
        await apiClient.post("/api/auth/logout").catch(() => undefined);
        clearSession();
      },
    }),
    [
      applySession,
      clearSession,
      isInitializing,
      organization,
      refresh,
      updateOrganization,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
