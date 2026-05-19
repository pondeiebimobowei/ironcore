import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  getCurrentOrganization,
  updateOrganizationProfile,
} from "../../features/organizations/api";
import { useAuth } from "../../lib/auth/AuthContext";

const tabs = [
  "Overview",
  "Business Details",
  "Branding",
  "Contact Person",
  "Social & Links",
];

const gymImages = ["Training floor", "Street view", "Reception"];

export function OrganizationProfilePage() {
  const { organization, updateOrganization } = useAuth();
  const [organizationName, setOrganizationName] = useState(
    organization?.name ?? "",
  );
  const [tagline, setTagline] = useState("Stronger Every Day");
  const [description, setDescription] = useState(
    "A focused fitness facility helping members recover momentum, renew on time, and stay consistent.",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getCurrentOrganization()
      .then((organization) => {
        if (active) {
          setOrganizationName(organization.name);
          updateOrganization({
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          });
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load organization profile.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [updateOrganization]);

  const descriptionCount = useMemo(() => description.length, [description]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (organizationName.trim().length < 2) {
      setError("Organization name must be at least 2 characters.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      const organization = await updateOrganizationProfile({
        name: organizationName.trim(),
      });
      updateOrganization({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      });
      setOrganizationName(organization.name);
      setMessage("Organization profile saved.");
    } catch {
      setError("Could not save organization profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page organization-profile-page">
      <header className="page-header organization-profile-header">
        <div>
          <div className="breadcrumb">
            <Link to="/settings">Settings</Link>
            <span>/</span>
          </div>
          <h1>Organisation Profile</h1>
          <p>Manage your gym information, contact details and branding.</p>
        </div>
        <button type="button" className="secondary-button">
          View Public Profile
        </button>
      </header>

      <nav className="settings-tabs" aria-label="Organisation profile sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === "Overview" ? "active" : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <section className="dashboard-state">
          <strong>Loading organization profile</strong>
          <span>Fetching your current organization details.</span>
        </section>
      ) : (
        <form className="organization-profile-form" onSubmit={handleSubmit}>
          {(error || message) && (
            <section
              className={`dashboard-state compact-state ${
                error ? "dashboard-state-error" : ""
              }`}
            >
              <strong>{error || message}</strong>
              <span>
                {error
                  ? "Review the profile fields and try again."
                  : "Your workspace name has been updated across the app."}
              </span>
            </section>
          )}

          <div className="organization-profile-grid">
            <section className="settings-panel organization-media-panel">
              <header>
                <h2>Organisation Logo</h2>
                <p>
                  This logo will be used across the platform and in member
                  communications.
                </p>
              </header>
              <div className="logo-editor">
                <div className="logo-preview" aria-hidden="true">
                  IC
                </div>
                <div className="logo-actions">
                  <button type="button" className="secondary-button">
                    Change Logo
                  </button>
                  <button type="button" className="secondary-button danger-text">
                    Remove
                  </button>
                </div>
              </div>
              <p className="settings-help">
                Recommended size: 500x500px. File types: JPG, PNG, SVG.
              </p>
            </section>

            <section className="settings-panel organization-info-panel">
              <header>
                <h2>Organisation Information</h2>
              </header>
              <div className="profile-form-grid">
                <label>
                  Organisation Name
                  <input
                    value={organizationName}
                    onChange={(event) =>
                      setOrganizationName(event.target.value)
                    }
                    placeholder="Peak Performance Gym"
                  />
                </label>
                <label>
                  Tagline (Optional)
                  <input
                    value={tagline}
                    onChange={(event) => setTagline(event.target.value)}
                    placeholder="Stronger Every Day"
                  />
                </label>
                <label className="wide-field character-field">
                  Short Description
                  <textarea
                    maxLength={250}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <span>{descriptionCount} / 250</span>
                </label>
                <label>
                  Established Year
                  <input defaultValue="2021" inputMode="numeric" />
                </label>
                <label>
                  Gym Type
                  <select defaultValue="Personal Training Gym">
                    <option>Personal Training Gym</option>
                    <option>Fitness Studio</option>
                    <option>Commercial Gym</option>
                  </select>
                </label>
                <label>
                  Website
                  <input
                    defaultValue={`https://${organization?.slug ?? "gym"}.com`}
                  />
                </label>
                <label>
                  Email
                  <input defaultValue="info@example.com" type="email" />
                </label>
                <label>
                  Phone
                  <input defaultValue="+234 801 234 5678" />
                </label>
                <label>
                  Secondary Phone (Optional)
                  <input defaultValue="+234 809 876 5432" />
                </label>
              </div>
            </section>

            <section className="settings-panel organization-images-panel">
              <header>
                <h2>Organisation Images</h2>
                <p>
                  Add photos of your gym. These images may be shown to members.
                </p>
              </header>
              <div className="gym-image-list">
                {gymImages.map((image) => (
                  <div className="gym-image-thumb" key={image}>
                    <span>{image}</span>
                  </div>
                ))}
                <button type="button" className="gym-image-add">
                  Add Image
                </button>
              </div>
              <p className="settings-help">
                You can upload up to 6 images. JPG, PNG. 3 / 6 images.
              </p>
            </section>

            <section className="settings-panel business-address-panel">
              <header>
                <h2>Business Address</h2>
              </header>
              <div className="profile-form-grid address-grid">
                <label className="wide-field">
                  Address
                  <input defaultValue="12 Freedom Way, Lekki Phase 1" />
                </label>
                <label>
                  City
                  <input defaultValue="Lagos" />
                </label>
                <label>
                  State
                  <input defaultValue="Lagos" />
                </label>
                <label>
                  Postal Code
                  <input defaultValue="106104" />
                </label>
                <label>
                  Country
                  <select defaultValue="Nigeria">
                    <option>Nigeria</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="settings-panel business-hours-panel">
              <header>
                <h2>Business Hours</h2>
              </header>
              <div className="business-hours-list">
                {["Monday - Friday", "Saturday", "Sunday"].map((day, index) => (
                  <div className="business-hours-row" key={day}>
                    <strong>{day}</strong>
                    <select
                      defaultValue={index === 0 ? "05:00 AM" : "07:00 AM"}
                    >
                      <option>05:00 AM</option>
                      <option>07:00 AM</option>
                      <option>09:00 AM</option>
                    </select>
                    <span>-</span>
                    <select
                      defaultValue={index === 2 ? "05:00 PM" : "10:00 PM"}
                    >
                      <option>05:00 PM</option>
                      <option>08:00 PM</option>
                      <option>10:00 PM</option>
                    </select>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      Open
                    </label>
                  </div>
                ))}
              </div>
              <label className="checkbox-label holiday-toggle">
                <input type="checkbox" />
                Closed on public holidays
              </label>
            </section>
          </div>

          <footer className="profile-save-bar">
            <Link to="/settings" className="secondary-button">
              Cancel
            </Link>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </footer>
        </form>
      )}
    </main>
  );
}
