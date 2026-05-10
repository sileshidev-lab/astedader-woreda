import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, ClipboardList, Users } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import { getMyHibretPortalDetail } from "../../../services/hibretPortalService";
import type { HibretPortalDetail } from "../../../services/hibretPortalService";

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function HibretAnalyticsPage() {
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<HibretPortalDetail | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");

    try {
      const data = await getMyHibretPortalDetail((user as any)?.hibretId);
      setDetail(data);
    } catch {
      setError("Unable to load Hibret analytics.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [(user as any)?.hibretId]);

  const analytics = useMemo(() => {
    const directives = detail?.directives ?? [];
    const reports = detail?.reports ?? [];
    const members = detail?.members ?? [];
    const families = detail?.families ?? [];

    const submittedReports = reports.filter((report) => report.submittedAt || report.status === "submitted" || report.status === "approved").length;
    const approvedReports = reports.filter((report) => report.reviewDecision === "approved" || report.status === "approved").length;
    const pendingReports = Math.max(directives.length - submittedReports, 0);
    const membersInFamilies = families.reduce((sum, family) => sum + family.members.length, 0);

    return {
      directives: directives.length,
      reports: reports.length,
      submittedReports,
      approvedReports,
      pendingReports,
      members: members.length,
      families: families.length,
      membersInFamilies,
      unassignedMembers: Math.max(members.length - membersInFamilies, 0),
      submissionRate: percent(submittedReports, directives.length),
      approvalRate: percent(approvedReports, reports.length),
    };
  }, [detail]);

  const directiveBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};

    (detail?.directives ?? []).forEach((directive) => {
      groups[directive.type] = (groups[directive.type] || 0) + 1;
    });

    return Object.entries(groups);
  }, [detail?.directives]);

  return (
    <section className="aw-design-page space-y-5">
      {error ? (
        <div className="rounded border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">{error}</div>
      ) : null}

      

      <div className="stat-grid">
        <Metric icon={ClipboardList} label="Assigned directives" value={analytics.directives} />
        <Metric icon={CheckCircle2} label="Submitted reports" value={analytics.submittedReports} tone="primary" />
        <Metric icon={Users} label="Members" value={analytics.members} />
        <Metric icon={Users} label="Families" value={analytics.families} tone="success" />
      </div>

      <div className="chart-grid">
        <section className="rounded border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
          <h2 className="flex items-center gap-2 text-lg font-black text-woreda-text">
            <BarChart3 size={18} />
            Report performance
          </h2>

          <div className="mt-5 space-y-4">
            <Progress label="Submission rate" value={analytics.submissionRate} />
            <Progress label="Approval rate" value={analytics.approvalRate} />
          </div>

          <div className="stat-grid mt-5">
            <SmallStat label="Pending reports" value={analytics.pendingReports} />
            <SmallStat label="Approved reports" value={analytics.approvedReports} />
            <SmallStat label="Total reports" value={analytics.reports} />
          </div>
        </section>

        <section className="rounded border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
          <h2 className="flex items-center gap-2 text-lg font-black text-woreda-text">
            <Users size={18} />
            Family structure
          </h2>

          <div className="stat-grid mt-5">
            <SmallStat label="Members in families" value={analytics.membersInFamilies} />
            <SmallStat label="Unassigned members" value={analytics.unassignedMembers} />
            <SmallStat label="Families" value={analytics.families} />
          </div>

          <div className="mt-5">
            <Progress label="Members assigned to families" value={percent(analytics.membersInFamilies, analytics.members)} />
          </div>
        </section>
      </div>

      <section className="rounded border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
        <h2 className="text-lg font-black text-woreda-text">Directive type breakdown</h2>

        {directiveBreakdown.length === 0 ? (
          <p className="mt-4 rounded border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-8 text-center text-sm font-semibold text-woreda-textMuted">
            No assigned directives found.
          </p>
        ) : (
          <div className="stat-grid mt-4">
            {directiveBreakdown.map(([type, count]) => (
              <SmallStat key={type} label={type.replace("_", " ")} value={count} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function Metric({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: number; tone?: "default" | "primary" | "success" }) {
  const valueClass = tone === "primary" ? "text-woreda-primary" : tone === "success" ? "text-woreda-success" : "text-woreda-text";
  return (
    <div className="stat-card rounded">
      <div className="flex items-center justify-between">
        <p className="stat-label">{label}</p>
        <Icon size={18} className="text-woreda-textMuted" />
      </div>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-woreda-border bg-woreda-surfaceLow p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">{label}</p>
      <p className="mt-1 text-xl font-black text-woreda-text">{value}</p>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm font-bold">
        <span className="text-woreda-text">{label}</span>
        <span className="text-woreda-primary">{value}%</span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded bg-woreda-surfaceLow">
        <div className="h-full rounded bg-woreda-primary" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
      </div>
    </div>
  );
}
