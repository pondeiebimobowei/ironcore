import { apiClient } from "../../lib/api/client";

export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  establishedYear: number | null;
  businessType: string | null;
  organizationSize: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  businessHours: unknown[] | null;
  closedOnPublicHolidays: boolean;
  logoUrl: string | null;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateOrganizationProfileInput = Partial<{
  name: string;
  tagline: string;
  description: string;
  establishedYear: number;
  businessType: string;
  organizationSize: string;
  websiteUrl: string;
  contactEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  businessHours: unknown[];
  closedOnPublicHolidays: boolean;
  logoUrl: string;
  imageUrls: string[];
}>;

export async function getCurrentOrganization() {
  const response = await apiClient.get<OrganizationProfile>(
    "/api/organization/current",
  );

  return response.data;
}

export async function updateOrganizationProfile(
  input: UpdateOrganizationProfileInput,
) {
  const response = await apiClient.patch<OrganizationProfile>(
    "/api/organization/current",
    input,
  );

  return response.data;
}
