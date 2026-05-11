import type { AuthUser } from "../types/auth";

export function hasPrivilege(user: AuthUser | null | undefined, privilege: string) {
  if (!user) return false;
  return user.privileges.includes("*") || user.privileges.includes(privilege);
}

export function hasAnyPrivilege(user: AuthUser | null | undefined, privileges: string[]) {
  if (!user) return false;
  if (user.privileges.includes("*")) return true;
  return privileges.some((priv) => user.privileges.includes(priv));
}

