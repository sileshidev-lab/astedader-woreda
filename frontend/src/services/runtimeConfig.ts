export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

export function isDevBypassLoginEnabled() {
  const flag = String(import.meta.env.VITE_DEV_BYPASS_LOGIN || "").toLowerCase();
  return import.meta.env.DEV && (flag === "true" || flag === "1" || flag === "yes");
}

