import { OrganizationRole } from '@prisma/client';

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: OrganizationRole | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    currency: string;
  } | null;
  onboardingRequired: boolean;
};
