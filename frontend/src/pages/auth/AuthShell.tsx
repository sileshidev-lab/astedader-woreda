import type { ReactNode } from "react";
import { AuthSplitVisual } from "./AuthSplitVisual";

type AuthShellProps = {
  children: ReactNode;
  variant?: "default" | "formal" | "split";
  splitPhotoUrls?: string[];
  splitCurvedCard?: boolean;
};

export function AuthShell({
  children,
  variant = "split",
  splitPhotoUrls = [],
}: AuthShellProps) {
  if (variant !== "split") {
    return (
      <main className="aw-auth-page aw-auth-simple-page">
        <section className="aw-auth-simple-card">{children}</section>
      </main>
    );
  }

  return (
    <main className="aw-auth-page aw-auth-split-page">
      <div className="aw-auth-split-shell">
        <section className="aw-auth-split-card" aria-label="Astedader Woreda sign in">
          <aside className="aw-auth-hero" aria-hidden="true">
            <AuthSplitVisual photoUrls={splitPhotoUrls} />
          </aside>

          <section className="aw-auth-form-section">
            <div className="aw-auth-form-wrapper">
              {children}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
