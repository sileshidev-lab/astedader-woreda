import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Button } from "@/components/ui/shadcn/button";

export function MemberFormDetailPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col space-y-6">
      <EmptyState
        title="Form detail not available"
        message="The backend API for forms is not available in this deployment, so form detail views cannot be loaded."
        action={
          <Button asChild variant="default" size="default">
            <Link to="/member/forms" className="inline-flex items-center gap-2">
              <ArrowLeft aria-hidden />
              Back to forms
            </Link>
          </Button>
        }
      />
    </section>
  );
}
