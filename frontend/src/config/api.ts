import { getApiBaseUrl } from "../services/runtimeConfig";

export const AUTH_TOKEN_KEY = "astedader_woreda_token";

export function apiBaseUrl() {
  return getApiBaseUrl();
}

