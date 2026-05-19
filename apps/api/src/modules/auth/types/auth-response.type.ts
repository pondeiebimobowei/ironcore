import { UserRole } from '@prisma/client';

export type AuthResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
};
