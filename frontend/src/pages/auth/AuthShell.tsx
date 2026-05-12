import type { ReactNode } from "react";
import { AuthSplitVisual } from "./AuthSplitVisual";

type AuthShellProps = {
  children: ReactNode;
  variant?: "default" | "formal" | "split";
  splitPhotoUrls?: string[];
  splitCurvedCard?: boolean;
};

// 2px hairline strip in the muted primary tone — institutional cue
// without the previous ceremonial gold gradient.
function OfficialStrip() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
      style={{ background: "var(--aw-primary)" }}
    />
  );
}

export function AuthShell({
  children,
  variant = "split",
  splitPhotoUrls = [],
}: AuthShellProps) {
  if (variant !== "split") {
    return (
      <main className="aw-auth-page aw-auth-simple-page">
        <section className="aw-auth-simple-card relative overflow-hidden">
          <OfficialStrip />
          {children}
        </section>
      </main>
    );
  }

  return (
    <main className="aw-auth-page aw-auth-split-page">
      <div className="aw-auth-split-shell">
        <section
          className="aw-auth-split-card relative overflow-hidden"
          aria-label="Astedader Woreda sign in"
        >
          <OfficialStrip />
          <aside className="aw-auth-hero" aria-hidden="true">
            <AuthSplitVisual photoUrls={splitPhotoUrls} />
          </aside>

          <section className="aw-auth-form-section">
            <div className="aw-auth-form-wrapper">{children}</div>
          </section>
        </section>
      </div>
    </main>
  );
}
