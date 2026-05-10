import { create } from "zustand";
import { AUTH_TOKEN_KEY, apiClient } from "../services/apiClient";
import type { AuthUser, LoginResponse, MeResponse } from "../types/auth";

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
  login: (email: string, password: string) => Promise<void | TwoFactorLoginResult>;
  completeTwoFactorLogin: (twoFactorToken: string, code: string) => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  logout: () => void;
  hasPrivilege: (privilege: string) => boolean;
};

function storeSession(token: string, user: AuthUser, set: any) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  set({
    user,
    token,
    isAuthenticated: true,
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(AUTH_TOKEN_KEY),
  isLoading: false,
  isAuthenticated: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),

  login: async (email, password) => {
    set({ isLoading: true });

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

  logout: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);

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
