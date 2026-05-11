import { EmptyState } from "../../../components/ui/EmptyState";
import { Link } from "react-router-dom";

export function MemberFormDetailPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col gap-5">
      <EmptyState
        title="Form detail not available"
        message="The backend API for forms is not available in this deployment, so form detail views cannot be loaded."
        action={
          <Link
            to="/member/forms"
            className="min-h-10 rounded-2xl bg-woreda-primary px-4 text-sm font-black text-white hover:brightness-105"
          >
            Back to forms
          </Link>
        }
      />
    </section>
  );
}

