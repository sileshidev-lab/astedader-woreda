export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
}

/**
 * Opt-in demo bypass. Only enabled when `VITE_DEV_BYPASS_LOGIN` is one of
 * `"true" | "1" | "yes"`. Otherwise the app uses the real backend `/auth/login`
 * → 2FA flow.
 */
export function isDevBypassLoginEnabled() {
  const raw = String(import.meta.env.VITE_DEV_BYPASS_LOGIN ?? "").toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * Dev convenience: prefill the WOREDA_ADMIN seeded credentials so that hitting
 * "Sign in" in a local dev build immediately exercises the real `/auth/login`
 * flow. In production builds prefill is off.
 */
export function isDevPrefillEnabled() {
  return Boolean(import.meta.env.DEV);
}

/**
 * Credential bank used by the LoginPage prefill + the demo-mode pills.
 *
 * - WOREDA_ADMIN / HIBRET_ADMIN: the actual seeded backend accounts
 *   (`prisma/seed.ts`). These will succeed against the real `/auth/login`
 *   endpoint whether or not `isDevBypassLoginEnabled()` is on.
 * - MEMBER: there is no seeded MEMBER login in the backend; the MEMBER demo
 *   credentials only work while `isDevBypassLoginEnabled()` is enabled, since
 *   that branch creates a synthetic dev-mode session client-side.
 */
export const DEMO_CREDENTIALS = {
  WOREDA_ADMIN: {
    email: "admin@woreda.local",
    password: "admin@123.A",
    label: "Woreda Admin",
  },
  HIBRET_ADMIN: {
    email: "hibret@woreda.local",
    password: "hibret@123.A",
    label: "Hibret Admin",
  },
  MEMBER: {
    email: "member@demo.gov.et",
    password: "demo1234",
    label: "Member",
  },
} as const;
