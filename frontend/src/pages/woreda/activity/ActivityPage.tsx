import { Search, SlidersHorizontal, RefreshCw } from "lucide-react";

export function ActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-4">
        <div className="aw-stat-card"><p className="aw-stat-label">Events Today</p><p className="aw-stat-value text-[var(--aw-primary)]">0</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Member Actions</p><p className="aw-stat-value text-[var(--aw-success)]">0</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Account Updates</p><p className="aw-stat-value text-[var(--aw-magenta)]">0</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Pending Reviews</p><p className="aw-stat-value text-[var(--aw-muted)]">0</p></div>
      </div>

      <section className="aw-panel shadow-soft">
        <header className="aw-panel-header !bg-[var(--aw-surface)] !py-6">
          <div className="min-w-0">
             <h2 className="aw-panel-title">System Activity Log</h2>
             <p className="text-xs font-bold text-[var(--aw-muted)] mt-1">Audit trail of administrative events and system changes.</p>
          </div>
          <button className="aw-btn aw-btn-outline !min-h-[38px] !px-3"><RefreshCw size={16}/></button>
        </header>

        <div className="aw-toolbar !border-none !rounded-none !bg-[var(--aw-surface-muted)] !p-4">
           <div className="aw-search-wrap !bg-[var(--aw-surface)] flex-1 max-w-md">
             <Search size={14} className="text-[var(--aw-muted)]"/>
             <input type="text" className="aw-search-input" placeholder="Search activity trail..." />
           </div>
           <div className="flex flex-wrap gap-2">
              <input type="date" className="aw-filter-select" />
              <select className="aw-filter-select"><option>All Admins</option></select>
           </div>
        </div>

        <div className="p-20 text-center flex flex-col items-center gap-4 text-[var(--aw-muted)]">
           <SlidersHorizontal size={48} strokeWidth={1}/>
           <p className="font-bold">No activity records found for the selected period.</p>
        </div>
      </section>
    </div>
  );
}
