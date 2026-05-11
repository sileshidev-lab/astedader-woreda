import type { UserRole } from "./auth";

export type AppUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  privileges: string[];
  hibretId?: string | null;
  memberId?: string | null;
};

