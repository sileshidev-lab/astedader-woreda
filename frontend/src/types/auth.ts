export type UserRole = "WOREDA_ADMIN" | "HIBRET_ADMIN" | "MEMBER";

export type AccountStatus = "ACTIVE" | "DISABLED" | "PENDING_SETUP";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  privileges: string[];
  hibretId: string | null;
  memberId: string | null;
  hibretName?: string | null;
  memberName?: string | null;
  twoFactorEnabled?: boolean;
};

export type LoginResponse =
  | {
      token: string;
      user: AuthUser;
      twoFactorRequired?: false;
    }
  | {
      twoFactorRequired: true;
      twoFactorToken: string;
      message: string;
      previewUrl?: string | null;
    };

export type MeResponse = {
  user: AuthUser;
};
