import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { router } from "./router/AppRouter";
import "./index.css";

Sentry.init({
  dsn:
    import.meta.env.VITE_GLITCHTIP_DSN ??
    "https://fed3db8575224496b894271d29b09528@app.glitchtip.com/24009",
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.01,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main className="page">
          <section className="dashboard-state dashboard-state-error">
            <strong>Something went wrong</strong>
            <span>Refresh the page or try again in a moment.</span>
          </section>
        </main>
      }
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
