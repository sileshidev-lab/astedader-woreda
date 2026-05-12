import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  FileWarning,
  Inbox,
} from "lucide-react";
import { getHibretAnnouncements } from "../../services/reportService";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";

type StatTone = "default" | "success" | "warning";

function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: typeof Inbox;
  tone?: StatTone;
}) {
  const labelToneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : "text-muted-foreground";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.06em] ${labelToneClass}`}
        >
          {label}
        </span>
        <Icon size={16} className="text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function statusToBadgeVariant(
  status: string | undefined,
): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" {
  if (!status) return "secondary";
  const normalized = status.toLowerCase();
  if (normalized.includes("approved") || normalized.includes("submitted")) {
    return "success";
  }
  if (normalized.includes("pending") || normalized.includes("draft")) {
    return "warning";
  }
  if (normalized.includes("rejected") || normalized.includes("overdue")) {
    return "destructive";
  }
  return "secondary";
}

export function HibretDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHibretAnnouncements({
        page: 1,
        pageSize: 20,
        status: "all",
        type: "all",
      });
      setData(result);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Unable to load Hibret dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (isLoading) return <LoadingState label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const summary = data?.summary || {};
  const announcements: any[] = data?.announcements || [];

  return (
    <section className="aw-design-page aw-mobile-page flex min-h-0 flex-1 flex-col space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Assigned directives"
          value={summary.assigned ?? announcements.length ?? 0}
          icon={ClipboardList}
        />
        <StatTile
          label="Pending reports"
          value={summary.pending ?? 0}
          icon={FileWarning}
          tone="warning"
        />
        <StatTile label="Submitted" value={summary.submitted ?? 0} icon={Inbox} />
        <StatTile
          label="Approved"
          value={summary.approved ?? 0}
          icon={ClipboardCheck}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Latest directives</CardTitle>
            <CardDescription>
              Quick access to the most recently assigned directives for your Hibret.
            </CardDescription>
          </div>
          <Button asChild variant="link" size="sm" className="ml-auto">
            <Link to="/hibret/announcements" className="inline-flex items-center gap-1">
              View all
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div>
            {announcements.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-muted/50 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-normal">{item.type}</span>
                    <Badge variant={statusToBadgeVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to={`/hibret/announcements/${item.id}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    Open
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            ))}
            {announcements.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm font-normal text-muted-foreground">
                No directives have been assigned to this Hibret yet.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
