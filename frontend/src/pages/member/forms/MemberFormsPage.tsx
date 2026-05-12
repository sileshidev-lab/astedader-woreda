import { Link } from "react-router-dom";
import { FolderOpen, Megaphone } from "lucide-react";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Button } from "@/components/ui/shadcn/button";

export function MemberFormsPage() {
  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col space-y-6">
      <EmptyState
        title="Forms are not available"
        message="This deployment does not expose a forms module in the backend API. You can still use broadcasts and resources from the sidebar."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="default" size="default">
              <Link to="/member/broadcasts" className="inline-flex items-center gap-2">
                <Megaphone aria-hidden />
                Open broadcasts
              </Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link to="/member/resources" className="inline-flex items-center gap-2">
                <FolderOpen aria-hidden />
                Open resources
              </Link>
            </Button>
          </div>
        }
      />
    </section>
  );
}
