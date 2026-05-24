import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthBrandPanel } from "../auth/AuthBrandPanel";
import { useAuth } from "../../lib/auth/AuthContext";
import { companySetupSchema, firstAuthError } from "../../lib/validations/auth";

export function CompanySetupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [organizationSize, setOrganizationSize] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (auth.isInitializing) {
    return <main className="page">Restoring session...</main>;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!auth.onboardingRequired) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const result = companySetupSchema.safeParse({
      name,
      businessType,
      organizationSize,
      contactEmail,
      primaryPhone,
      addressLine,
      city,
      state,
      country,
    });

    if (!result.success) {
      setError(firstAuthError(result) ?? "Review the form and try again.");
      return;
    }

    try {
      setIsSubmitting(true);
      await auth.setupOrganization(result.data);
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Could not set up this company.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setError("");
    setMessage(
      "You can complete company setup later, but the workspace is required before opening the dashboard.",
    );
  };

  return (
    <main className="auth-page auth-page-signup">
      <AuthBrandPanel />
      <section className="auth-form-region" aria-label="Company setup">
        <form
          className="auth-card auth-card-wide"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-card-header">
            <span className="auth-step-badge">Company setup</span>
            <h1>Set up your company</h1>
            <p>
              Create the workspace that will own your members, payments, tasks,
              and recovery workflows.
            </p>
          </div>

          <label className="auth-field">
            <span>Company or organization name</span>
            <input
              autoComplete="organization"
              name="organization"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Peak Performance Gym"
              aria-invalid={Boolean(error)}
            />
          </label>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Business type</span>
              <select
                value={businessType}
                onChange={(event) => setBusinessType(event.target.value)}
              >
                <option value="">Select business type</option>
                <option value="Personal Training Gym">
                  Personal Training Gym
                </option>
                <option value="Fitness Studio">Fitness Studio</option>
                <option value="Commercial Gym">Commercial Gym</option>
              </select>
            </label>

            <label className="auth-field">
              <span>Company size</span>
              <select
                value={organizationSize}
                onChange={(event) => setOrganizationSize(event.target.value)}
              >
                <option value="">Select company size</option>
                <option value="1-5">1-5 team members</option>
                <option value="6-20">6-20 team members</option>
                <option value="21+">21+ team members</option>
              </select>
            </label>
          </div>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>Contact email</span>
              <input
                autoComplete="email"
                inputMode="email"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="info@example.com"
              />
            </label>

            <label className="auth-field">
              <span>Primary phone</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={primaryPhone}
                onChange={(event) => setPrimaryPhone(event.target.value)}
                placeholder="+234 801 234 5678"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Address</span>
            <input
              autoComplete="street-address"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="12 Freedom Way, Lekki Phase 1"
            />
          </label>

          <div className="auth-form-grid">
            <label className="auth-field">
              <span>City</span>
              <input
                autoComplete="address-level2"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Lagos"
              />
            </label>

            <label className="auth-field">
              <span>State</span>
              <input
                autoComplete="address-level1"
                value={state}
                onChange={(event) => setState(event.target.value)}
                placeholder="Lagos"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Country</span>
            <input
              autoComplete="country-name"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Nigeria"
            />
          </label>

          {message ? <p className="auth-note">{message}</p> : null}

          {error ? (
            <p className="auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="auth-action-stack">
            <button
              className="auth-primary-action"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating workspace..." : "Complete setup"}
            </button>
            <button
              className="auth-secondary-action"
              type="button"
              disabled={isSubmitting}
              onClick={handleSkip}
            >
              Skip and complete later
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
