import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "./runtimeConfig";

export const AUTH_TOKEN_KEY = "astedader_woreda_token";

// Must match `DEV_BYPASS_TOKEN` in `stores/authStore.ts`. Hard-coded here to
// avoid a circular dependency between the apiClient and the auth store.
const DEV_BYPASS_TOKEN = "dev-bypass-token";

const AUTH_LOGIN_PATHS = ["/auth/login", "/auth/login/2fa"];

function isLoginAttemptUrl(url?: string | null) {
  if (!url) return false;
  return AUTH_LOGIN_PATHS.some((path) => url.endsWith(path) || url.includes(`${path}?`));
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isHandling401 = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

    if (
      status === 401 &&
      !isHandling401 &&
      storedToken &&
      storedToken !== DEV_BYPASS_TOKEN &&
      !isLoginAttemptUrl(url)
    ) {
      isHandling401 = true;

      void import("../stores/authStore")
        .then(({ useAuthStore }) => {
          try {
            useAuthStore.getState().logout();
          } catch {
            localStorage.removeItem(AUTH_TOKEN_KEY);
          }
        })
        .catch(() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        })
        .finally(() => {
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.assign("/login");
          }
        });
    }

    return Promise.reject(error);
  }
);
