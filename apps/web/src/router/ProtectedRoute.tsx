import type { ReactNode } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
  isAuthenticated: boolean;
  fallback?: ReactNode;
};

export function ProtectedRoute({
  children,
  isAuthenticated,
  fallback = null,
}: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return fallback;
  }

  return children;
}
