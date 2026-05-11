import type { NextFunction, Request, Response } from "express";

function hasPrivilege(userPrivileges: string[], required: string[]) {
  if (userPrivileges.includes("*")) return true;
  return required.some((privilege) => userPrivileges.includes(privilege));
}

export function requirePrivilege(privilege: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const privileges = req.user?.privileges ?? [];

    if (hasPrivilege(privileges, [privilege])) {
      return next();
    }

    return res.status(403).json({ message: "Permission denied" });
  };
}

export function requireAnyPrivilege(privilegesToAllow: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const privileges = req.user?.privileges ?? [];

    if (hasPrivilege(privileges, privilegesToAllow)) {
      return next();
    }

    return res.status(403).json({ message: "Permission denied" });
  };
}
