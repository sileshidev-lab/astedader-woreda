import { Link } from "react-router-dom";
import { Newspaper, Plus } from "lucide-react";
import { PublishedBroadcastsPage } from "../../shared/content/PublishedBroadcastsPage";
import { useAuthStore } from "../../../store/authStore";

export function BroadcastsPage() {
  const { hasPrivilege } = useAuthStore();
  const canCreate = hasPrivilege("broadcast.create");

  return (
    <div className="flex flex-col gap-6">
      <header className="aw-panel !rounded-3xl shrink-0 overflow-hidden shadow-soft">
        <div className="h-1.5 bg-gradient-to-r from-[var(--aw-primary)] via-[var(--aw-yellow)] to-[var(--aw-magenta)]" />
        <div className="flex flex-col gap-4 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between bg-[var(--aw-surface)]">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]">
              <Newspaper size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--aw-primary)] mb-1">Official Communication</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--aw-text)]">Broadcasts</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-[var(--aw-muted)] leading-relaxed">Publish and read official Woreda news, updates and articles.</p>
            </div>
          </div>
          {canCreate && (
            <Link to="/woreda/broadcasts/new" className="aw-btn aw-btn-primary !min-h-[46px] !px-6 !rounded-2xl shadow-lg">
              <Plus size={18} />
              <span>Create Article</span>
            </Link>
          )}
        </div>
      </header>

      <main className="aw-panel shadow-soft overflow-hidden !border-none">
        <PublishedBroadcastsPage
          title="Archive"
          subtitle="Explore all published communication records."
        />
      </main>
    </div>
  );
}
