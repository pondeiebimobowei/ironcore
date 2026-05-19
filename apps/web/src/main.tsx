import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { GlitchTipErrorBoundary } from "./lib/monitoring/GlitchTipErrorBoundary";
import { initGlitchTip } from "./lib/monitoring/glitchtip";
import { router } from "./router/AppRouter";
import "./index.css";

initGlitchTip({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  environment: import.meta.env.MODE,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlitchTipErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </GlitchTipErrorBoundary>
  </StrictMode>,
);
