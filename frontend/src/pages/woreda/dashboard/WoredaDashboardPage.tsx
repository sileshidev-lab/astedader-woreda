import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  GalleryHorizontalEnd,
  LayoutDashboard,
  Plus,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getWoredaDashboardData,
  type WoredaDashboardData,
  type HibretPerformanceRow,
} from "../../../services/dashboardService";
import { ErrorState } from "../../../components/ui/ErrorState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";

// ============================================================================
// TYPES
// ============================================================================

type PerformanceRow = {
  id: string;
  name: string;
  shortName: string;
  performanceScore: number;
  submittedReports: number;
  targetedDirectives: number;
  attendanceScore: number;
  memberCount: number;
  attendanceExpected: number;
  attendanceMarked: number;
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceExcused: number;
  attendanceUnmarked: number;
};

type ChartColors = {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Muted, enterprise palette. Used for distribution pies / categorical bars.
const CHART_COLORS = [
  "#1E293B", // primary (slate)
  "#475569", // slate accent
  "#1D4ED8", // info
  "#15803D", // success
  "#B45309", // warning
  "#B42318", // danger
  "#64748B", // muted slate
  "#0E7490", // teal-700 (muted)
  "#7C3AED", // violet-600 (muted)
  "#475569",
  "#334155",
  "#9CA3AF",
  "#3F6212", // olive
  "#9F1239", // crimson
  "#0F766E", // teal
  "#5B21B6", // violet-800
  "#1E40AF",
];

const COLOR = {
  primary: "#1E293B",
  primaryLight: "#475569",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B42318",
  info: "#1D4ED8",
  slate: "#64748B",
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return "—";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function useViewport() {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    ...dimensions,
    isMobile: dimensions.width < 640,
    isTablet: dimensions.width >= 640 && dimensions.width < 1024,
    isDesktop: dimensions.width >= 1024,
    isWide: dimensions.width >= 1536,
  };
}

function useChartColors(): ChartColors {
  return useMemo(() => {
    if (typeof document === "undefined") {
      return {
        axis: "#475569",
        grid: "rgba(100, 116, 139, 0.2)",
        tooltipBg: "#FFFFFF",
        tooltipBorder: "#E2E8F0",
        tooltipText: "#0F172A",
      };
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    return {
      axis: isDark ? "#CBD5E1" : "#475569",
      grid: isDark ? "rgba(203, 213, 225, 0.18)" : "rgba(100, 116, 139, 0.2)",
      tooltipBg: isDark ? "#0F172A" : "#FFFFFF",
      tooltipBorder: isDark ? "#1F2A3C" : "#E2E8F0",
      tooltipText: isDark ? "#E6EBF2" : "#0F172A",
    };
  }, []);
}

// ============================================================================
// KPI CARD
// ============================================================================

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}

function KpiCard({ label, value, subtitle, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
        <Icon size={16} className="text-muted-foreground" aria-hidden />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        {subtitle ? (
          <p className="mt-2 line-clamp-2 text-xs font-normal text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// CHART TOOLTIP
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: PerformanceRow;
    name?: string;
  }>;
}

function PerformanceTooltip({ active, payload }: TooltipProps) {
  const colors = useChartColors();
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const value = Number(payload[0]?.value ?? 0);

  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-md"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      <p className="max-w-[260px] truncate text-sm font-semibold">{data?.name ?? "—"}</p>
      <p className="mt-1 font-normal">
        {value}% · {data?.submittedReports ?? 0}/{data?.targetedDirectives ?? 0} reports
        {typeof data?.attendanceScore === "number" && ` · Attendance ${data.attendanceScore}%`}
      </p>
    </div>
  );
}

// ============================================================================
// PERFORMANCE BAR CHART
// ============================================================================

interface PerformanceChartProps {
  data: PerformanceRow[];
}

function PerformanceChart({ data }: PerformanceChartProps) {
  const { isMobile, isTablet } = useViewport();
  const colors = useChartColors();

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        shortName: truncateText(row.name, isMobile ? 12 : isTablet ? 16 : 22),
        performanceScore: clampPercent(row.performanceScore),
      })),
    [data, isMobile, isTablet],
  );

  if (!chartData.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-8 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            No performance data available
          </p>
          <p className="text-xs font-normal text-muted-foreground">
            Check back later for updates
          </p>
        </div>
      </div>
    );
  }

  const minWidth = isMobile ? Math.max(600, chartData.length * 70) : "100%";

  return (
    <div>
      {isMobile && chartData.length > 5 && (
        <div className="mb-2 flex items-center gap-2 text-[10px] font-normal text-muted-foreground">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
            →
          </span>
          <span>Swipe to view all hibrets</span>
        </div>
      )}
      <div className={isMobile ? "overflow-x-auto" : ""}>
        <div style={{ minWidth: isMobile ? minWidth : undefined }}>
          <ResponsiveContainer width="100%" height={isMobile ? 420 : 480}>
            <BarChart
              data={chartData}
              margin={{
                top: 16,
                right: 24,
                bottom: isMobile ? 100 : 120,
                left: 8,
              }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="shortName"
                interval={0}
                angle={-50}
                textAnchor="end"
                height={isMobile ? 100 : 120}
                tick={{ fill: colors.axis, fontSize: isMobile ? 10 : 11, fontWeight: 400 }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: colors.axis, fontSize: 11, fontWeight: 400 }}
                width={50}
              />
              <Tooltip
                content={<PerformanceTooltip />}
                cursor={{ fill: "rgba(30, 41, 59, 0.06)" }}
              />
              <Bar
                dataKey="performanceScore"
                fill={COLOR.primary}
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MEMBERS DISTRIBUTION PIE CHART
// ============================================================================

interface MembersChartProps {
  data: PerformanceRow[];
}

function MembersDistributionChart({ data }: MembersChartProps) {
  const { isMobile } = useViewport();

  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter((row) => row.memberCount > 0)
      .sort((a, b) => b.memberCount - a.memberCount);

    const total = sorted.reduce((sum, row) => sum + row.memberCount, 0);
    const maxVisible = isMobile ? 5 : 8;

    const visible = sorted.slice(0, maxVisible).map((row, i) => ({
      name: row.name,
      shortName: truncateText(row.name, isMobile ? 18 : 30),
      value: row.memberCount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const remaining = sorted.slice(maxVisible);
    if (remaining.length > 0) {
      const remainingTotal = remaining.reduce((sum, row) => sum + row.memberCount, 0);
      visible.push({
        name: `Others (${remaining.length} Hibrets)`,
        shortName: `Others (${remaining.length})`,
        value: remainingTotal,
        color: COLOR.slate,
      });
    }

    return { total, items: visible };
  }, [data, isMobile]);

  if (!chartData.items.length) {
    return (
      <div className="flex min-h-[150px] items-center justify-center p-6">
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium text-muted-foreground">No data available</p>
          <p className="text-[10px] font-normal text-muted-foreground">
            Members data will appear here
          </p>
        </div>
      </div>
    );
  }

  const chartSize = isMobile ? 200 : 240;

  return (
    <div className="space-y-4 p-4">
      <div className="relative mx-auto" style={{ width: chartSize, height: chartSize }}>
        <ResponsiveContainer width={chartSize} height={chartSize}>
          <PieChart>
            <Pie
              data={chartData.items}
              dataKey="value"
              nameKey="name"
              innerRadius={isMobile ? 45 : 60}
              outerRadius={isMobile ? 80 : 100}
              paddingAngle={2}
              stroke="var(--aw-surface)"
              strokeWidth={2}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {chartData.items.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, _name: any, item: any) => [
                `${value} members`,
                item.payload.name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {chartData.total}
          </p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Members
          </p>
        </div>
      </div>

      <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
        {chartData.items.map((item) => {
          const percent =
            chartData.total > 0
              ? Math.round((item.value / chartData.total) * 100)
              : 0;
          return (
            <div
              key={item.name}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 transition-colors hover:bg-muted/50"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium text-foreground"
                  title={item.name}
                >
                  {item.shortName}
                </p>
                <p className="text-[10px] font-normal text-muted-foreground">
                  {item.value} · {percent}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[96px] rounded-md border border-border bg-muted/50" />
        ))}
      </div>
      <div className="h-[480px] rounded-md border border-border bg-muted/50" />
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS SIDEBAR
// ============================================================================

interface QuickAction {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface SidebarProps {
  performanceData: PerformanceRow[];
}

function QuickActionsSidebar({ performanceData }: SidebarProps) {
  const actions: QuickAction[] = [
    {
      to: "/woreda/announcements",
      label: "Directives",
      description: "Create and track directives",
      icon: ClipboardList,
    },
    {
      to: "/woreda/gallery",
      label: "Gallery",
      description: "Review submitted media",
      icon: GalleryHorizontalEnd,
    },
    {
      to: "/woreda/members",
      label: "Members",
      description: "Member records and accounts",
      icon: Users,
    },
    {
      to: "/woreda/activity",
      label: "Activity",
      description: "Admin activity history",
      icon: Activity,
    },
  ];

  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard size={16} aria-hidden className="text-muted-foreground" />
              Quick actions
            </CardTitle>
            <CardDescription>Frequent Woreda operations</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 py-0">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-muted/50"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {action.label}
                  </p>
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card className="hidden md:block">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users size={16} aria-hidden className="text-muted-foreground" />
              Members by Hibret
            </CardTitle>
            <CardDescription>Top member distribution</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2 pt-0">
          <MembersDistributionChart data={performanceData} />
        </CardContent>
      </Card>
    </aside>
  );
}

// ============================================================================
// MEMBER ANALYTICS
// ============================================================================

function MemberAnalyticsSection({
  data,
  metrics,
}: {
  data: WoredaDashboardData;
  metrics: {
    hibrets: number;
    members: number;
    activeMembers: number;
    candidateMembers: number;
  };
}) {
  const memberTiles = [
    {
      label: "Total",
      value: metrics.members,
      tone: "default" as const,
      percent: null,
    },
    {
      label: "Active",
      value: metrics.activeMembers,
      tone: "success" as const,
      percent:
        metrics.members > 0
          ? Math.round((metrics.activeMembers / metrics.members) * 100)
          : 0,
    },
    {
      label: "Candidate",
      value: metrics.candidateMembers,
      tone: "warning" as const,
      percent:
        metrics.members > 0
          ? Math.round((metrics.candidateMembers / metrics.members) * 100)
          : 0,
    },
    {
      label: "Male",
      value: data.summary.maleMembers ?? 0,
      tone: "info" as const,
      percent:
        metrics.members > 0
          ? Math.round(((data.summary.maleMembers ?? 0) / metrics.members) * 100)
          : 0,
    },
    {
      label: "Female",
      value: data.summary.femaleMembers ?? 0,
      tone: "danger" as const,
      percent:
        metrics.members > 0
          ? Math.round(((data.summary.femaleMembers ?? 0) / metrics.members) * 100)
          : 0,
    },
    {
      label: "Hibrets",
      value: metrics.hibrets,
      tone: "default" as const,
      percent: null,
    },
  ];

  const toneToColor: Record<string, string> = {
    default: "text-foreground",
    success: "text-[var(--aw-success)]",
    warning: "text-[var(--aw-warning)]",
    info: "text-[var(--aw-info)]",
    danger: "text-[var(--aw-danger)]",
  };

  return (
    <div className="border-t border-border px-5 py-5">
      <div className="mb-4 flex items-center gap-2">
        <Users size={16} className="text-muted-foreground" aria-hidden />
        <h3 className="text-base font-semibold text-foreground">Member analytics</h3>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3 lg:grid-cols-6">
        {memberTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-md border border-border bg-card p-3"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
              {tile.label}
            </p>
            <p
              className={`mt-1 text-lg font-semibold tabular-nums ${toneToColor[tile.tone]}`}
            >
              {tile.value}
            </p>
            {tile.percent !== null ? (
              <p className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                {tile.percent}%
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gender */}
        <div className="rounded-md border border-border bg-card p-3">
          <h4 className="mb-2 text-xs font-medium text-foreground">Gender</h4>
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie
                data={[
                  { name: "Male", value: data.summary.maleMembers ?? 0 },
                  { name: "Female", value: data.summary.femaleMembers ?? 0 },
                ].filter((item) => item.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={22}
                outerRadius={42}
                paddingAngle={2}
                animationDuration={600}
              >
                <Cell fill={COLOR.info} />
                <Cell fill={COLOR.danger} />
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} members`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] font-normal text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLOR.info }}
              />
              M{" "}
              {metrics.members > 0
                ? Math.round(((data.summary.maleMembers ?? 0) / metrics.members) * 100)
                : 0}
              %
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLOR.danger }}
              />
              F{" "}
              {metrics.members > 0
                ? Math.round(((data.summary.femaleMembers ?? 0) / metrics.members) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-md border border-border bg-card p-3">
          <h4 className="mb-2 text-xs font-medium text-foreground">Status</h4>
          <ResponsiveContainer width="100%" height={110}>
            <PieChart>
              <Pie
                data={[
                  { name: "Active", value: metrics.activeMembers },
                  { name: "Candidate", value: metrics.candidateMembers },
                ].filter((item) => item.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={22}
                outerRadius={42}
                paddingAngle={2}
                animationDuration={600}
              >
                <Cell fill={COLOR.success} />
                <Cell fill={COLOR.warning} />
              </Pie>
              <Tooltip formatter={(value: any) => [`${value} members`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[10px] font-normal text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLOR.success }}
              />
              Active{" "}
              {metrics.members > 0
                ? Math.round((metrics.activeMembers / metrics.members) * 100)
                : 0}
              %
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLOR.warning }}
              />
              Cand{" "}
              {metrics.members > 0
                ? Math.round((metrics.candidateMembers / metrics.members) * 100)
                : 0}
              %
            </span>
          </div>
        </div>

        {/* Education */}
        <div className="rounded-md border border-border bg-card p-3">
          <h4 className="mb-2 text-xs font-medium text-foreground">Education</h4>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={
                data.summary.educationDistribution
                  ? Object.entries(data.summary.educationDistribution)
                      .map(([name, value]) => ({
                        name: name.length > 8 ? `${name.slice(0, 8)}.` : name,
                        value,
                      }))
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                  : []
              }
              margin={{ top: 4, right: 4, bottom: 22, left: 4 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 8, fill: "var(--aw-muted)" }}
                angle={-30}
                textAnchor="end"
                height={30}
              />
              <Tooltip cursor={{ fill: "rgba(30, 41, 59, 0.06)" }} />
              <Bar
                dataKey="value"
                fill={COLOR.primary}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age */}
        <div className="rounded-md border border-border bg-card p-3">
          <h4 className="mb-2 text-xs font-medium text-foreground">Age</h4>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart
              data={
                data.summary.ageDistribution
                  ? [
                      { name: "18-30", value: data.summary.ageDistribution["18-30"] ?? 0 },
                      { name: "31-45", value: data.summary.ageDistribution["31-45"] ?? 0 },
                      { name: "46+", value: data.summary.ageDistribution["46+"] ?? 0 },
                    ].filter((item) => item.value > 0)
                  : []
              }
              margin={{ top: 4, right: 4, bottom: 22, left: 4 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 8, fill: "var(--aw-muted)" }}
                height={28}
              />
              <Tooltip cursor={{ fill: "rgba(30, 41, 59, 0.06)" }} />
              <Bar
                dataKey="value"
                fill={COLOR.success}
                radius={[3, 3, 0, 0]}
                animationDuration={600}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export function WoredaDashboardPage() {
  const [data, setData] = useState<WoredaDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getWoredaDashboardData();
        if (mounted) {
          setData(response);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        if (mounted) {
          setError("Failed to load dashboard data. Please try refreshing the page.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    if (!data) {
      return {
        hibrets: 0,
        members: 0,
        activeMembers: 0,
        candidateMembers: 0,
        directives: 0,
        published: 0,
        closed: 0,
        submissionRate: 0,
        totalReports: 0,
        totalTargets: 0,
      };
    }

    return {
      hibrets: data.summary.hibrets ?? 0,
      members: data.summary.members ?? 0,
      activeMembers: data.summary.activeMembers ?? 0,
      candidateMembers: data.summary.candidateMembers ?? 0,
      directives: data.summary.directives ?? 0,
      published: data.summary.publishedDirectives ?? 0,
      closed: data.summary.closedDirectives ?? 0,
      submissionRate: data.summary.submissionRate ?? 0,
      totalReports: data.summary.totalReports ?? 0,
      totalTargets: data.summary.totalTargets ?? 0,
    };
  }, [data]);

  const performanceData = useMemo<PerformanceRow[]>(() => {
    if (!data) return [];

    return data.hibretPerformance.map((row: HibretPerformanceRow) => ({
      id: row.id,
      name: row.name,
      shortName: truncateText(row.name, 20),
      performanceScore: row.performanceScore,
      submittedReports: row.submittedReports,
      targetedDirectives: row.targetedDirectives,
      attendanceScore: row.attendanceScore,
      memberCount: row.memberCount,
      attendanceExpected: row.attendanceExpected,
      attendanceMarked: row.attendanceMarked,
      attendancePresent: row.attendancePresent,
      attendanceAbsent: row.attendanceAbsent,
      attendanceExcused: row.attendanceExcused,
      attendanceUnmarked: Math.max(row.attendanceExpected - row.attendanceMarked, 0),
    }));
  }, [data]);

  return (
    <div className="flex w-full flex-col space-y-6">
      {/* KPI Cards row with primary action */}
      <div className="grid gap-4 2xl:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Hibrets"
            value={metrics.hibrets}
            subtitle="Administrative units"
            icon={BarChart3}
          />
          <KpiCard
            label="Members"
            value={metrics.members}
            subtitle={`${metrics.activeMembers} active · ${metrics.candidateMembers} candidate`}
            icon={Users}
          />
          <KpiCard
            label="Directives"
            value={metrics.directives}
            subtitle={`${metrics.published} published · ${metrics.closed} closed`}
            icon={ClipboardList}
          />
          <KpiCard
            label="Submission rate"
            value={`${metrics.submissionRate}%`}
            subtitle={`${metrics.totalReports}/${metrics.totalTargets} targeted reports`}
            icon={CheckCircle2}
          />
        </div>

        <div className="flex 2xl:w-[200px] 2xl:items-stretch">
          <Button asChild variant="default" size="default" className="w-full 2xl:h-full">
            <Link to="/woreda/announcements" className="inline-flex items-center gap-2">
              <Plus aria-hidden />
              New directive
            </Link>
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && <SkeletonLoader />}

      {/* Error */}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      )}

      {/* Main content */}
      {!isLoading && !error && data && (
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_400px]">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3
                    size={16}
                    aria-hidden
                    className="text-muted-foreground"
                  />
                  Hibret performance
                </CardTitle>
                <CardDescription>
                  Score combines report submission and attendance where available.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
              <PerformanceChart data={performanceData} />
            </CardContent>

            {/* Mobile fallback message */}
            <div className="block border-t border-border bg-muted/40 p-3 md:hidden">
              <div className="flex items-start gap-2.5 rounded-md border border-dashed border-border bg-card p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <LayoutDashboard size={16} aria-hidden />
                </span>
                <div className="flex-1 space-y-0.5">
                  <p className="text-xs font-medium text-foreground">
                    Additional analytics available
                  </p>
                  <p className="text-[11px] font-normal leading-relaxed text-muted-foreground">
                    Member analytics, demographics, and distribution charts are
                    available on desktop view for better visualization.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop member analytics */}
            <div className="hidden md:block">
              <MemberAnalyticsSection data={data} metrics={metrics} />
            </div>
          </Card>

          <QuickActionsSidebar performanceData={performanceData} />
        </div>
      )}
    </div>
  );
}
