import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import {
  firstAuthError,
  signupAccountSchema,
} from "../../lib/validations/auth";
import { AuthBrandPanel } from "./AuthBrandPanel";

export function SignupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const passwordChecks = useMemo(
    () => [
      { label: "8 characters", met: password.length >= 8 },
      {
        label: "Passwords match",
        met: password.length > 0 && password === confirmPassword,
      },
    ],
    [confirmPassword, password],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const result = signupAccountSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!result.success) {
      setError(firstAuthError(result) ?? "Review the form and try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await auth.signup({
        fullName: result.data.fullName,
        email: result.data.email,
        password: result.data.password,
      });
      navigate("/onboarding/company", { replace: true });
    } catch {
      setError("Could not create this account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-page-signup">
      <AuthBrandPanel />
      <section className="auth-form-region" aria-label="Create account">
        <header className="auth-top-link">
          <span>Already have an account?</span>
          <Link to="/login">Sign in</Link>
        </header>

        <form
          className="auth-card auth-card-wide"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-card-header">
            <span className="auth-step-badge">Your account</span>
            <h1>Create your account</h1>
            <p>Start with your login details. Company setup comes next.</p>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Full name</span>
              <input
                autoComplete="name"
                name="name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ada Okonkwo"
                aria-invalid={Boolean(error)}
              />
            </label>

            <label className="auth-field">
              <span>Work email</span>
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                aria-invalid={Boolean(error)}
              />
            </label>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Password</span>
              <input
                autoComplete="new-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
                aria-invalid={Boolean(error)}
              />
            </label>

            <label className="auth-field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                aria-invalid={Boolean(error)}
              />
            </label>
          </div>

          <ul className="auth-password-checks" aria-label="Password checks">
            {passwordChecks.map((check) => (
              <li key={check.label} className={check.met ? "met" : undefined}>
                <span aria-hidden="true">{check.met ? "OK" : "--"}</span>
                {check.label}
              </li>
            ))}
          </ul>

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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}
