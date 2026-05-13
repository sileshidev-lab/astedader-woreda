import { useEffect, useMemo, useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { getMyHibretPortalDetail } from "../../../services/hibretPortalService";
import type { HibretPortalDetail } from "../../../services/hibretPortalService";

function percent(v: number, t: number) { return t ? Math.round((v / t) * 100) : 0; }

export function HibretAnalyticsPage() {
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<HibretPortalDetail | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");
    try { const data = await getMyHibretPortalDetail((user as any)?.hibretId); setDetail(data); }
    catch { setError("Unable to load performance metrics."); }
  }

  useEffect(() => { void loadData(); }, [(user as any)?.hibretId]);

  const analytics = useMemo(() => {
    const ds = detail?.directives ?? []; const rs = detail?.reports ?? [];
    const ms = detail?.members ?? []; const fs = detail?.families ?? [];
    const sub = rs.filter(r => r.submittedAt || r.status === "submitted" || r.status === "approved").length;
    const app = rs.filter(r => r.reviewDecision === "approved" || r.status === "approved").length;
    const mif = fs.reduce((s, f) => s + f.members.length, 0);
    return {
      directives: ds.length, submittedReports: sub, approvedReports: app,
      pendingReports: Math.max(ds.length - sub, 0), members: ms.length, families: fs.length,
      membersInFamilies: mif, unassignedMembers: Math.max(ms.length - mif, 0),
      submissionRate: percent(sub, ds.length), approvalRate: percent(app, sub),
    };
  }, [detail]);

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="aw-panel !bg-[var(--aw-danger-bg)] !border-[var(--aw-danger)] px-4 py-3 text-sm font-black text-[var(--aw-danger)]">{error}</div>}

      <div className="aw-stat-grid !grid-cols-2 md:!grid-cols-4">
        <div className="aw-stat-card"><p className="aw-stat-label">Directives</p><p className="aw-stat-value">{analytics.directives}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Submission %</p><p className="aw-stat-value text-[var(--aw-success)]">{analytics.submissionRate}%</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Population</p><p className="aw-stat-value text-[var(--aw-primary)]">{analytics.members}</p></div>
        <div className="aw-stat-card"><p className="aw-stat-label">Families</p><p className="aw-stat-value text-[var(--aw-magenta)]">{analytics.families}</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         <section className="aw-panel p-6 shadow-soft">
            <h2 className="text-lg font-black flex items-center gap-2 mb-8"><BarChart3 size={20} className="text-[var(--aw-primary)]" />Report Performance</h2>
            <div className="space-y-8">
               <Progress label="Overall Submission Rate" value={analytics.submissionRate} />
               <Progress label="Woreda Approval Rate" value={analytics.approvalRate} />
               <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="p-4 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
                     <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Total Reports</p>
                     <p className="text-xl font-black">{detail?.reports?.length || 0}</p>
                  </div>
                  <div className="p-4 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
                     <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Submitted</p>
                     <p className="text-xl font-black text-[var(--aw-success)]">{analytics.submittedReports}</p>
                  </div>
                  <div className="p-4 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)]">
                     <p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Approved</p>
                     <p className="text-xl font-black text-[var(--aw-primary)]">{analytics.approvedReports}</p>
                  </div>
               </div>
            </div>
         </section>

         <section className="aw-panel p-6 shadow-soft">
            <h2 className="text-lg font-black flex items-center gap-2 mb-8"><Users size={20} className="text-[var(--aw-primary)]" />Family Structure</h2>
            <div className="space-y-8">
               <Progress label="Members in Families" value={percent(analytics.membersInFamilies, analytics.members)} />
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)] flex items-center justify-between">
                     <div><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Assigned</p><p className="text-2xl font-black">{analytics.membersInFamilies}</p></div>
                     <Users size={24} className="text-[var(--aw-primary)] opacity-20" />
                  </div>
                  <div className="p-5 bg-[var(--aw-bg)] rounded-2xl border border-[var(--aw-border-soft)] flex items-center justify-between">
                     <div><p className="text-[10px] font-black uppercase text-[var(--aw-muted)] mb-1">Unassigned</p><p className="text-2xl font-black text-[var(--aw-magenta)]">{analytics.unassignedMembers}</p></div>
                     <Users size={24} className="text-[var(--aw-magenta)] opacity-20" />
                  </div>
               </div>
            </div>
         </section>
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-3">
        <span className="text-xs font-black uppercase tracking-wider text-[var(--aw-muted)]">{label}</span>
        <span className="text-base font-black text-[var(--aw-primary)]">{value}%</span>
      </div>
      <div className="h-3 bg-[var(--aw-bg)] rounded-full border border-[var(--aw-border-soft)] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[var(--aw-primary)] to-[var(--aw-primary-dark)] rounded-full transition-all duration-1000" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}
