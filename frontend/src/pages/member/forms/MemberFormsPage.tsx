import { EmptyState } from "../../../components/ui/EmptyState";
import { Link } from "react-router-dom";

export function MemberFormsPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <EmptyState
        title="Forms are not available"
        message="This deployment does not expose a forms module in the backend API. You can still use broadcasts and resources from the sidebar."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/member/broadcasts"
              className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
            >
              Open broadcasts
            </Link>
            <Link
              to="/member/resources"
              className="min-h-10 rounded-2xl border border-woreda-border bg-woreda-surface px-4 text-sm font-black text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Open resources
            </Link>
          </div>
        }
      />
    </section>
  );
}

