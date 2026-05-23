import { OrganizationRole } from '@prisma/client';

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: OrganizationRole;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};
