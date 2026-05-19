import { apiClient } from "../../lib/api/client";

export type OrganizationProfile = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateOrganizationProfileInput = {
  name: string;
};

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
