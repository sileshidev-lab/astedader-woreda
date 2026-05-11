import type { ReactNode } from "react";

type FourKGuardProps = {
  children: ReactNode;
  className?: string;
};

export function FourKGuard({ children, className = "" }: FourKGuardProps) {
  return <div className={["aw-fluid-guard", className].filter(Boolean).join(" ")}>{children}</div>;
}
