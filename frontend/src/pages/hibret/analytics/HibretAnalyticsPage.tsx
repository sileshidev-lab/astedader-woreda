import { useEffect, useMemo, useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { getMyHibretPortalDetail } from "../../../services/hibretPortalService";
import type { HibretPortalDetail } from "../../../services/hibretPortalService";
import { EmptyState } from "../../../components/ui/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function StatTile({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  tone?: "default" | "success" | "warning";
}) {
  const labelToneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneClass}`}
        >
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div>
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-medium text-primary tabular-nums">{clamped}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export function HibretAnalyticsPage() {
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<HibretPortalDetail | null>(null);
  const [error, setError] = useState("");

  async function loadData() {
    setError("");

    const hibretId = user?.hibretId;
    if (!hibretId) {
      setDetail(null);
      setError("Unable to load Hibret analytics.");
      return;
    }

    try {
      const data = await getMyHibretPortalDetail(hibretId);
      setDetail(data);
    } catch {
      setError("Unable to load Hibret analytics.");
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.hibretId]);

  const analytics = useMemo(() => {
    const directives = detail?.directives ?? [];
    const reports = detail?.reports ?? [];
    const members = detail?.members ?? [];
    const families = detail?.families ?? [];

    const submittedReports = reports.filter(
      (report) =>
        report.submittedAt || report.status === "submitted" || report.status === "approved",
    ).length;
    const approvedReports = reports.filter(
      (report) => report.reviewDecision === "approved" || report.status === "approved",
    ).length;
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
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Assigned directives"
          value={analytics.directives}
          subtitle="Current directives in this Hibret"
        />
        <StatTile
          label="Submitted reports"
          value={analytics.submittedReports}
          subtitle="Reports sent for review"
          tone="success"
        />
        <StatTile
          label="Members"
          value={analytics.members}
          subtitle="Registered Hibret members"
        />
        <StatTile
          label="Families"
          value={analytics.families}
          subtitle="Family structures in this Hibret"
          tone="warning"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 aria-hidden className="text-muted-foreground" />
              Report performance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Submission and review progress for directives assigned to this Hibret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Progress label="Submission rate" value={analytics.submissionRate} />
            <Progress label="Approval rate" value={analytics.approvalRate} />
            <div className="grid grid-cols-3 gap-3">
              <SmallStat label="Pending reports" value={analytics.pendingReports} />
              <SmallStat label="Approved reports" value={analytics.approvedReports} />
              <SmallStat label="Total reports" value={analytics.reports} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Users aria-hidden className="text-muted-foreground" />
              Family structure
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Household organization and member assignment inside the Hibret.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <SmallStat label="Members in families" value={analytics.membersInFamilies} />
              <SmallStat label="Unassigned members" value={analytics.unassignedMembers} />
              <SmallStat label="Families" value={analytics.families} />
            </div>
            <Progress
              label="Members assigned to families"
              value={percent(analytics.membersInFamilies, analytics.members)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Directive type breakdown</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            A quick look at the kinds of directives currently assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {directiveBreakdown.length === 0 ? (
            <EmptyState
              title="No assigned directives found"
              message="Directive analytics will appear here as work is assigned."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {directiveBreakdown.map(([type, count]) => (
                <SmallStat key={type} label={type.replace("_", " ")} value={count} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
