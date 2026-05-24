import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing, onboardingRequired } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <main className="page">Restoring session...</main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (onboardingRequired) {
    return <Navigate to="/onboarding/company" replace />;
  }

  return <Outlet />;
}
