import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { supportMailto } from "../../lib/support/contact";
import { firstAuthError, loginSchema } from "../../lib/validations/auth";
import { AuthBrandPanel } from "./AuthBrandPanel";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      setError(firstAuthError(result) ?? "Review the form and try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      const session = await auth.login({
        email: result.data.email,
        password: result.data.password,
      });
      const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from
          ?.pathname ?? "/dashboard";
      const nextPath = session.onboardingRequired
        ? "/onboarding/company"
        : redirectPath;
      navigate(nextPath, { replace: true });
    } catch {
      setError("Email or password is incorrect.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-page-login">
      <AuthBrandPanel />
      <section className="auth-form-region" aria-label="Sign in">
        <header className="auth-top-link">
          <span>Need help?</span>
          <a href={supportMailto}>Contact support</a>
        </header>

        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <div className="auth-card-header">
            <span className="auth-step-badge">Welcome back</span>
            <h1>Sign in to IronCore</h1>
            <p>Access your recovery dashboard and payment queue.</p>
          </div>

          <label className="auth-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={Boolean(error)}
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              aria-invalid={Boolean(error)}
            />
          </label>

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="auth-primary-action"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="auth-secondary-row">
            <a href={supportMailto}>Forgot password?</a>
            <span>
              New to IronCore? <Link to="/signup">Create account</Link>
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
