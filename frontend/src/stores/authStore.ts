import { create } from "zustand";
import { AUTH_TOKEN_KEY, apiClient } from "../services/apiClient";
import { isDevBypassLoginEnabled } from "../services/runtimeConfig";
import type { AuthUser, LoginResponse, MeResponse, UserRole } from "../types/auth";

type TwoFactorLoginResult = {
  twoFactorRequired: true;
  twoFactorToken: string;
  message?: string;
  previewUrl?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    options?: { mockRole?: UserRole }
  ) => Promise<void | TwoFactorLoginResult>;
  completeTwoFactorLogin: (twoFactorToken: string, code: string) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  applySession: (token: string, user: AuthUser) => void;
  logout: () => void;
  hasPrivilege: (privilege: string) => boolean;
};

const DEV_BYPASS_TOKEN = "dev-bypass-token";
const DEV_BYPASS_USER_KEY = "astedader_woreda_dev_bypass_user";

const DEV_BYPASS_USER: AuthUser = {
  id: "dev-woreda-admin",
  email: "dev-admin@astedader.local",
  role: "WOREDA_ADMIN",
  status: "ACTIVE",
  privileges: ["*"],
  hibretId: null,
  memberId: null,
  hibretName: null,
  memberName: "Development Admin",
  twoFactorEnabled: false,
};

function buildDevBypassUser(email: string, role: UserRole): AuthUser {
  const normalizedEmail = email.trim() || `dev-${role.toLowerCase()}@astedader.local`;

  if (role === "HIBRET_ADMIN") {
    return {
      id: "dev-hibret-admin",
      email: normalizedEmail,
      role,
      status: "ACTIVE",
      privileges: [
        "announcement.read",
        "announcement.create",
        "announcement.update",
        "member.read",
        "resource.read",
        "chat.read",
        "chat.send",
      ],
      hibretId: "dev-hibret-1",
      memberId: null,
      hibretName: "Development Hibret",
      memberName: null,
      twoFactorEnabled: false,
    };
  }

  if (role === "MEMBER") {
    return {
      id: "dev-member",
      email: normalizedEmail,
      role,
      status: "ACTIVE",
      privileges: ["profile.read", "profile.update", "resource.read"],
      hibretId: "dev-hibret-1",
      memberId: "dev-member-1",
      hibretName: "Development Hibret",
      memberName: "Development Member",
      twoFactorEnabled: false,
    };
  }

  return {
    ...DEV_BYPASS_USER,
    email: normalizedEmail,
  };
}

function storeSession(token: string, user: AuthUser, set: any) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  set({
    user,
    token,
    isAuthenticated: true,
    isLoading: false,
  });
}

function getStoredDevBypassUser() {
  const raw = localStorage.getItem(DEV_BYPASS_USER_KEY);
  if (!raw) return DEV_BYPASS_USER;

  try {
    return {
      ...DEV_BYPASS_USER,
      ...JSON.parse(raw),
    } as AuthUser;
  } catch {
    return DEV_BYPASS_USER;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(AUTH_TOKEN_KEY),
  isLoading: false,
  isAuthenticated: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),

  login: async (email, password, options) => {
    set({ isLoading: true });

    if (isDevBypassLoginEnabled()) {
      const mockUser = buildDevBypassUser(email, options?.mockRole || "WOREDA_ADMIN");

      localStorage.setItem(DEV_BYPASS_USER_KEY, JSON.stringify(mockUser));
      storeSession(DEV_BYPASS_TOKEN, mockUser, set);
      return;
    }

    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      if ("twoFactorRequired" in response.data && response.data.twoFactorRequired) {
        set({ isLoading: false });

        return {
          twoFactorRequired: true,
          twoFactorToken: response.data.twoFactorToken,
          message: response.data.message,
          previewUrl: response.data.previewUrl,
        };
      }

      storeSession(response.data.token, response.data.user, set);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  completeTwoFactorLogin: async (twoFactorToken, code) => {
    set({ isLoading: true });

    try {
      const response = await apiClient.post<{
        token: string;
        user: AuthUser;
      }>("/auth/login/2fa", {
        twoFactorToken,
        code,
      });

      storeSession(response.data.token, response.data.user, set);
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loadCurrentUser: async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    if (isDevBypassLoginEnabled() && token === DEV_BYPASS_TOKEN) {
      set({
        user: getStoredDevBypassUser(),
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true });

    try {
      const response = await apiClient.get<MeResponse>("/auth/me");

      set({
        user: response.data.user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  applySession: (token, user) => {
    storeSession(token, user, set);
  },

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(DEV_BYPASS_USER_KEY);

    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  hasPrivilege: (privilege) => {
    const user = get().user;
    if (!user) return false;
    return user.privileges.includes("*") || user.privileges.includes(privilege);
  },
}));
