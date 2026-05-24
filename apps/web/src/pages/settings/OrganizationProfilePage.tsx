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

type BusinessHour = {
  label: string;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
};

const defaultBusinessHours: BusinessHour[] = [
  {
    label: "Monday - Friday",
    opensAt: "05:00 AM",
    closesAt: "10:00 PM",
    isOpen: true,
  },
  {
    label: "Saturday",
    opensAt: "07:00 AM",
    closesAt: "10:00 PM",
    isOpen: true,
  },
  { label: "Sunday", opensAt: "07:00 AM", closesAt: "05:00 PM", isOpen: true },
];

export function OrganizationProfilePage() {
  const { organization, updateOrganization } = useAuth();
  const [organizationName, setOrganizationName] = useState(
    organization?.name ?? "",
  );
  const [tagline, setTagline] = useState("Stronger Every Day");
  const [description, setDescription] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [organizationSize, setOrganizationSize] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [businessHours, setBusinessHours] =
    useState<BusinessHour[]>(defaultBusinessHours);
  const [closedOnPublicHolidays, setClosedOnPublicHolidays] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
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
          setTagline(organization.tagline ?? "");
          setDescription(organization.description ?? "");
          setEstablishedYear(
            organization.establishedYear
              ? String(organization.establishedYear)
              : "",
          );
          setBusinessType(organization.businessType ?? "");
          setOrganizationSize(organization.organizationSize ?? "");
          setWebsiteUrl(organization.websiteUrl ?? "");
          setContactEmail(organization.contactEmail ?? "");
          setPrimaryPhone(organization.primaryPhone ?? "");
          setSecondaryPhone(organization.secondaryPhone ?? "");
          setAddressLine(organization.addressLine ?? "");
          setCity(organization.city ?? "");
          setState(organization.state ?? "");
          setPostalCode(organization.postalCode ?? "");
          setCountry(organization.country ?? "Nigeria");
          setBusinessHours(
            parseBusinessHours(organization.businessHours) ??
              defaultBusinessHours,
          );
          setClosedOnPublicHolidays(organization.closedOnPublicHolidays);
          setLogoUrl(organization.logoUrl ?? "");
          setImageUrls(organization.imageUrls);
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
        tagline: emptyToUndefined(tagline),
        description: emptyToUndefined(description),
        establishedYear: establishedYear ? Number(establishedYear) : undefined,
        businessType: emptyToUndefined(businessType),
        organizationSize: emptyToUndefined(organizationSize),
        websiteUrl: emptyToUndefined(websiteUrl),
        contactEmail: emptyToUndefined(contactEmail),
        primaryPhone: emptyToUndefined(primaryPhone),
        secondaryPhone: emptyToUndefined(secondaryPhone),
        addressLine: emptyToUndefined(addressLine),
        city: emptyToUndefined(city),
        state: emptyToUndefined(state),
        postalCode: emptyToUndefined(postalCode),
        country: emptyToUndefined(country),
        businessHours,
        closedOnPublicHolidays,
        logoUrl: emptyToUndefined(logoUrl),
        imageUrls,
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
                  : "Your workspace profile has been updated across the app."}
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
                  <button
                    type="button"
                    className="secondary-button danger-text"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <label>
                Logo URL
                <input
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </label>
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
                  <input
                    value={establishedYear}
                    onChange={(event) => setEstablishedYear(event.target.value)}
                    inputMode="numeric"
                    placeholder="2021"
                  />
                </label>
                <label>
                  Gym Type
                  <select
                    value={businessType}
                    onChange={(event) => setBusinessType(event.target.value)}
                  >
                    <option value="">Select gym type</option>
                    <option>Personal Training Gym</option>
                    <option>Fitness Studio</option>
                    <option>Commercial Gym</option>
                  </select>
                </label>
                <label>
                  Organisation Size
                  <select
                    value={organizationSize}
                    onChange={(event) =>
                      setOrganizationSize(event.target.value)
                    }
                  >
                    <option value="">Select organisation size</option>
                    <option value="1-5">1-5 team members</option>
                    <option value="6-20">6-20 team members</option>
                    <option value="21+">21+ team members</option>
                  </select>
                </label>
                <label>
                  Website
                  <input
                    value={websiteUrl}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                    placeholder={`https://${organization?.slug ?? "gym"}.com`}
                  />
                </label>
                <label>
                  Email
                  <input
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="info@example.com"
                    type="email"
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={primaryPhone}
                    onChange={(event) => setPrimaryPhone(event.target.value)}
                    placeholder="+234 801 234 5678"
                  />
                </label>
                <label>
                  Secondary Phone (Optional)
                  <input
                    value={secondaryPhone}
                    onChange={(event) => setSecondaryPhone(event.target.value)}
                    placeholder="+234 809 876 5432"
                  />
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
                {imageUrls.length === 0 ? (
                  <div className="gym-image-thumb">
                    <span>No images yet</span>
                  </div>
                ) : null}
                {imageUrls.map((image) => (
                  <div className="gym-image-thumb" key={image}>
                    <span>{image}</span>
                  </div>
                ))}
                <button type="button" className="gym-image-add">
                  Add Image
                </button>
              </div>
              <p className="settings-help">
                You can upload up to 6 images. JPG, PNG. {imageUrls.length} / 6
                images.
              </p>
              <label>
                Image URLs
                <textarea
                  value={imageUrls.join("\n")}
                  onChange={(event) =>
                    setImageUrls(
                      event.target.value
                        .split(/\r?\n/)
                        .map((url) => url.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="https://example.com/image-1.jpg"
                />
              </label>
            </section>

            <section className="settings-panel business-address-panel">
              <header>
                <h2>Business Address</h2>
              </header>
              <div className="profile-form-grid address-grid">
                <label className="wide-field">
                  Address
                  <input
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                    placeholder="12 Freedom Way, Lekki Phase 1"
                  />
                </label>
                <label>
                  City
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="Lagos"
                  />
                </label>
                <label>
                  State
                  <input
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                    placeholder="Lagos"
                  />
                </label>
                <label>
                  Postal Code
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="106104"
                  />
                </label>
                <label>
                  Country
                  <select
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                  >
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
                {businessHours.map((hour, index) => (
                  <div className="business-hours-row" key={hour.label}>
                    <strong>{hour.label}</strong>
                    <select
                      value={hour.opensAt}
                      onChange={(event) =>
                        updateBusinessHour(index, {
                          opensAt: event.target.value,
                        })
                      }
                    >
                      <option>05:00 AM</option>
                      <option>07:00 AM</option>
                      <option>09:00 AM</option>
                    </select>
                    <span>-</span>
                    <select
                      value={hour.closesAt}
                      onChange={(event) =>
                        updateBusinessHour(index, {
                          closesAt: event.target.value,
                        })
                      }
                    >
                      <option>05:00 PM</option>
                      <option>08:00 PM</option>
                      <option>10:00 PM</option>
                    </select>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={hour.isOpen}
                        onChange={(event) =>
                          updateBusinessHour(index, {
                            isOpen: event.target.checked,
                          })
                        }
                      />
                      Open
                    </label>
                  </div>
                ))}
              </div>
              <label className="checkbox-label holiday-toggle">
                <input
                  type="checkbox"
                  checked={closedOnPublicHolidays}
                  onChange={(event) =>
                    setClosedOnPublicHolidays(event.target.checked)
                  }
                />
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

  function updateBusinessHour(index: number, patch: Partial<BusinessHour>) {
    setBusinessHours((current) =>
      current.map((hour, currentIndex) =>
        currentIndex === index ? { ...hour, ...patch } : hour,
      ),
    );
  }
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();

  return trimmed || undefined;
}

function parseBusinessHours(value: unknown): BusinessHour[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const hours = value.filter(
    (hour): hour is BusinessHour =>
      typeof hour === "object" &&
      hour !== null &&
      "label" in hour &&
      "opensAt" in hour &&
      "closesAt" in hour &&
      "isOpen" in hour,
  );

  return hours.length > 0 ? hours : null;
}
