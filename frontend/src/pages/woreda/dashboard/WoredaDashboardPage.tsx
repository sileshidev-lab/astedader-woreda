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

const CHART_COLORS = [
  "#00658D", "#EC008C", "#FFD100", "#0D6E4D", "#8A6D00", "#6B7280",
  "#2563EB", "#7C3AED", "#DB2777", "#059669", "#D97706", "#475569",
  "#0891B2", "#BE123C", "#65A30D", "#9333EA", "#0284C7",
];

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
        axis: "#4A5568",
        grid: "rgba(74, 85, 104, 0.22)",
        tooltipBg: "#FFFFFF",
        tooltipBorder: "#CBD5E1",
        tooltipText: "#191C1D",
      };
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    return {
      axis: isDark ? "#E2E8F0" : "#4A5568",
      grid: isDark ? "rgba(226, 232, 240, 0.26)" : "rgba(74, 85, 104, 0.22)",
      tooltipBg: isDark ? "#1C1F23" : "#FFFFFF",
      tooltipBorder: isDark ? "#3D454D" : "#CBD5E1",
      tooltipText: isDark ? "#F8FAFC" : "#191C1D",
    };
  }, []);
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  variant: "primary" | "warning" | "danger" | "success";
}

function StatCard({ label, value, subtitle, icon: Icon, variant }: StatCardProps) {
  const variants = {
    primary: {
      iconBg: "bg-[var(--aw-primary)]",
      softBg: "bg-[var(--aw-primary-soft)]",
      accentBar: "bg-[var(--aw-primary)]",
      iconText: "text-white",
      hoverBg: "hover:bg-[var(--aw-primary-soft)]/40",
    },
    warning: {
      iconBg: "bg-[var(--aw-yellow)]",
      softBg: "bg-[var(--aw-yellow-bg)]",
      accentBar: "bg-[var(--aw-yellow)]",
      iconText: "text-[var(--aw-primary-strong)]",
      hoverBg: "hover:bg-[var(--aw-yellow-bg)]/60",
    },
    danger: {
      iconBg: "bg-[var(--aw-magenta)]",
      softBg: "bg-[var(--aw-magenta-bg)]",
      accentBar: "bg-[var(--aw-magenta)]",
      iconText: "text-white",
      hoverBg: "hover:bg-[var(--aw-magenta-bg)]/40",
    },
    success: {
      iconBg: "bg-[var(--aw-success)]",
      softBg: "bg-[var(--aw-success-bg)]",
      accentBar: "bg-[var(--aw-success)]",
      iconText: "text-white",
      hoverBg: "hover:bg-[var(--aw-success-bg)]/40",
    },
  };

  const style = variants[variant];

  return (
    <article className={`group relative min-h-[120px] overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${style.hoverBg} sm:min-h-[128px] sm:p-5 2xl:min-h-[136px]`}>
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-full transition-transform duration-500 group-hover:scale-110 ${style.softBg}`} />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)] transition-colors group-hover:text-[var(--aw-text)]">
            {label}
          </p>
          <p className="text-[clamp(1.65rem,2.7vw,2.45rem)] font-black leading-none text-[var(--aw-text)] transition-transform duration-300 group-hover:scale-105">
            {value}
          </p>
          <p className="line-clamp-2 text-xs font-bold leading-snug text-[var(--aw-muted)]">
            {subtitle}
          </p>
        </div>

        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${style.iconBg} ${style.iconText} sm:h-12 sm:w-12`}>
          <Icon size={20} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-12" />
        </div>
      </div>

      <div className={`relative mt-4 h-1.5 rounded-full transition-all duration-500 ${style.accentBar}`}>
        <div className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
      </div>
    </article>
  );
}

// ============================================================================
// CHART TOOLTIP COMPONENT
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
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const value = Number(payload[0]?.value ?? 0);
  const colors = useChartColors();

  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-xl"
      style={{
        background: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        color: colors.tooltipText,
      }}
    >
      <p className="max-w-[260px] truncate font-black">{data?.name ?? "—"}</p>
      <p className="mt-1 font-semibold">
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
    [data, isMobile, isTablet]
  );

  if (!chartData.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-8 text-center transition-all hover:border-[var(--aw-primary)]/50">
        <div className="space-y-2">
          <p className="text-sm font-bold text-[var(--aw-muted)]">No performance data available</p>
          <p className="text-xs text-[var(--aw-muted)]">Check back later for updates</p>
        </div>
      </div>
    );
  }

  // Calculate minimum width for mobile horizontal scroll
  // Each bar needs ~80px, minimum 600px to show ~7-8 hibrets comfortably
  const minWidth = isMobile ? Math.max(600, chartData.length * 70) : "100%";

  return (
    <div className="transition-opacity duration-500 hover:opacity-100">
      {isMobile && chartData.length > 5 && (
        <div className="mb-2 flex items-center gap-2 text-[10px] text-[var(--aw-muted)]">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--aw-primary-soft)]">
            <span className="text-[var(--aw-primary)]">→</span>
          </div>
          <span className="font-semibold">Swipe left to view all hibrets</span>
        </div>
      )}
      <div className={isMobile ? "overflow-x-auto" : ""}>
        <div style={{ minWidth: isMobile ? minWidth : undefined }}>
          <ResponsiveContainer width="100%" height={isMobile ? 450 : 500}>
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                bottom: isMobile ? 100 : 120,
                left: 10,
              }}
            >
              <CartesianGrid stroke={colors.grid} vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="shortName"
                interval={0}
                angle={-50}
                textAnchor="end"
                height={isMobile ? 100 : 120}
                tick={{ fill: colors.axis, fontSize: isMobile ? 10 : 11, fontWeight: 700 }}
                tickMargin={10}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: colors.axis, fontSize: 11, fontWeight: 700 }}
                width={50}
              />
              <Tooltip content={<PerformanceTooltip />} cursor={{ fill: "rgba(0,101,141,0.05)" }} />
              <Bar
                dataKey="performanceScore"
                fill="var(--aw-primary)"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
                animationDuration={800}
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
// MEMBERS PIE CHART
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
        color: "#64748B",
      });
    }

    return { total, items: visible };
  }, [data, isMobile]);

  if (!chartData.items.length) {
    return (
      <div className="flex min-h-[150px] items-center justify-center p-6 transition-all hover:bg-[var(--aw-surface-muted)]/50">
        <div className="space-y-1 text-center">
          <p className="text-xs font-bold text-[var(--aw-muted)]">No data available</p>
          <p className="text-[10px] text-[var(--aw-muted)]">Members data will appear here</p>
        </div>
      </div>
    );
  }

  const chartSize = isMobile ? 200 : 240;

  return (
    <div className="space-y-4 p-4">
      {/* Pie Chart */}
      <div className="group relative mx-auto transition-transform duration-500 hover:scale-105" style={{ width: chartSize, height: chartSize }}>
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
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.items.map((entry) => (
                <Cell key={entry.name} fill={entry.color} className="transition-opacity duration-300 hover:opacity-80" />
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

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <p className="text-2xl font-black text-[var(--aw-text)] transition-all duration-300 sm:text-3xl">{chartData.total}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-[var(--aw-muted)] transition-colors duration-300 group-hover:text-[var(--aw-primary)] sm:text-[10px]">
            Members
          </p>
        </div>
      </div>

      {/* Legend List */}
      <div className="max-h-[350px] space-y-2 overflow-y-auto pr-1">
        {chartData.items.map((item, index) => {
          const percent = chartData.total > 0 ? Math.round((item.value / chartData.total) * 100) : 0;
          return (
            <div
              key={item.name}
              className="group flex items-center gap-2 rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-2 transition-all duration-300 hover:scale-[1.02] hover:border-[var(--aw-primary)] hover:bg-[var(--aw-primary-soft)]/20 hover:shadow-sm"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span 
                className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125" 
                style={{ background: item.color }} 
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-black text-[var(--aw-text)] transition-colors group-hover:text-[var(--aw-primary)]" title={item.name}>
                  {item.shortName}
                </p>
                <p className="text-[9px] font-semibold text-[var(--aw-muted)] transition-all group-hover:translate-x-1">
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
    <div className="animate-pulse space-y-5">
      {/* Skeleton KPI Cards */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[120px] rounded-3xl bg-[var(--aw-surface-muted)] sm:h-[128px]" />
        ))}
      </div>

      {/* Skeleton Chart */}
      <div className="h-[500px] rounded-3xl bg-[var(--aw-surface-muted)]" />
    </div>
  );
}

// ============================================================================
// SECTION HEADER
// ============================================================================

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <header className="group flex items-start gap-2 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-3 py-2.5 transition-colors hover:bg-[var(--aw-primary-soft)]/20 sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)] transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--aw-primary)] group-hover:text-white group-hover:shadow-md sm:h-10 sm:w-10">
        <Icon size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:rotate-6 sm:size-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xs font-black text-[var(--aw-text)] transition-colors group-hover:text-[var(--aw-primary)] sm:text-sm md:text-base">{title}</h2>
        <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight text-[var(--aw-muted)] sm:mt-1 sm:text-[10px] md:text-xs">
          {subtitle}
        </p>
      </div>
    </header>
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
    <aside className="space-y-5">
      {/* Quick Actions */}
      <section className="overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm transition-all duration-300 hover:shadow-lg">
        <SectionHeader
          icon={LayoutDashboard}
          title="Quick Actions"
          subtitle="Frequent Woreda operations"
        />
        <div className="divide-y divide-[var(--aw-border-soft)]">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3 p-3 transition-all duration-300 hover:bg-[var(--aw-primary-soft)]/40 sm:p-4 hover:pl-4 sm:hover:pl-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--aw-primary)] group-hover:text-white group-hover:shadow-md group-hover:rotate-3 sm:h-10 sm:w-10">
                  <Icon size={16} strokeWidth={2.5} className="transition-transform duration-300 group-hover:scale-110 sm:size-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-xs font-black text-[var(--aw-text)] transition-colors group-hover:text-[var(--aw-primary)] sm:text-sm">
                    {action.label}
                  </h3>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--aw-muted)] transition-all group-hover:translate-x-1 sm:text-xs">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Members Distribution - Hidden on Mobile */}
      <section className="hidden overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm transition-all duration-300 hover:shadow-lg md:block">
        <SectionHeader
          icon={Users}
          title="Members by Hibret"
          subtitle="Top member distribution"
        />
        <MembersDistributionChart data={performanceData} />
      </section>
    </aside>
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
    <div className="flex w-full flex-col gap-4 sm:gap-5 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid shrink-0 gap-4 sm:gap-5 2xl:grid-cols-[1fr_auto] animate-in slide-in-from-top duration-700">
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Hibrets"
            value={metrics.hibrets}
            subtitle="Administrative units"
            icon={BarChart3}
            variant="primary"
          />
          <StatCard
            label="Members"
            value={metrics.members}
            subtitle={`${metrics.activeMembers} active · ${metrics.candidateMembers} candidate`}
            icon={Users}
            variant="warning"
          />
          <StatCard
            label="Directives"
            value={metrics.directives}
            subtitle={`${metrics.published} published · ${metrics.closed} closed`}
            icon={ClipboardList}
            variant="danger"
          />
          <StatCard
            label="Submission Rate"
            value={`${metrics.submissionRate}%`}
            subtitle={`${metrics.totalReports}/${metrics.totalTargets} targeted reports`}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        <Link
          to="/woreda/announcements"
          className="group relative flex min-h-[80px] w-full items-center justify-center gap-2 overflow-hidden rounded-3xl bg-[var(--aw-primary)] px-4 py-3 text-xs font-black text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[var(--aw-primary-dark)] hover:shadow-xl sm:min-h-[128px] sm:px-6 sm:py-4 sm:text-sm 2xl:min-h-[136px] 2xl:w-[200px]"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <Plus size={18} strokeWidth={3} className="relative transition-transform duration-300 group-hover:rotate-90 sm:size-5" />
          <span className="relative transition-transform duration-300 group-hover:scale-105">New Directive</span>
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && <SkeletonLoader />}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] p-8">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aw-danger-bg)]">
              <Activity size={32} className="text-[var(--aw-danger)]" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-black text-[var(--aw-text)]">Unable to Load Dashboard</p>
              <p className="text-sm text-[var(--aw-muted)]">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[var(--aw-primary)] px-6 py-3 text-sm font-black text-white transition-all hover:bg-[var(--aw-primary-dark)] hover:shadow-lg"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && data && (
        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[1fr_400px] animate-in fade-in slide-in-from-bottom duration-700">
          {/* Performance Chart & Analytics */}
          <section className="overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm transition-all duration-300 hover:shadow-lg">
            <SectionHeader
              icon={BarChart3}
              title="Hibret Performance"
              subtitle="Score combines report submission and attendance where available"
            />
            <div className="p-3 transition-opacity duration-300 hover:opacity-100 sm:p-4">
              <PerformanceChart data={performanceData} />
            </div>

            {/* Mobile Message - Desktop Required */}
            <div className="block border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)]/50 p-3 md:hidden">
              <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-[var(--aw-primary)]/30 bg-[var(--aw-primary-soft)]/20 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]">
                  <LayoutDashboard size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-[11px] font-black leading-tight text-[var(--aw-text)]">Additional Analytics Available</p>
                  <p className="text-[10px] leading-relaxed text-[var(--aw-muted)]">
                    Member analytics, demographics, and distribution charts are available on desktop view for better visualization.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Member Analytics - Hidden on Mobile */}
            <div className="hidden border-t border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)]/30 p-4 md:block">
              <div className="mb-4 flex items-center gap-2">
                <Users size={18} className="text-[var(--aw-primary)]" strokeWidth={2.5} />
                <h3 className="text-sm font-black text-[var(--aw-text)]">Member Analytics</h3>
              </div>
              
              {/* Quick Stats */}
              <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Total</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-text)] sm:mt-1 sm:text-xl">{metrics.members}</p>
                </div>
                
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Active</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-success)] sm:mt-1 sm:text-xl">{metrics.activeMembers}</p>
                  <p className="mt-0.5 text-[7px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                    {metrics.members > 0 ? Math.round((metrics.activeMembers / metrics.members) * 100) : 0}%
                  </p>
                </div>
                
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Cand</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-yellow)] sm:mt-1 sm:text-xl">{metrics.candidateMembers}</p>
                  <p className="mt-0.5 text-[7px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                    {metrics.members > 0 ? Math.round((metrics.candidateMembers / metrics.members) * 100) : 0}%
                  </p>
                </div>
                
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Male</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-primary)] sm:mt-1 sm:text-xl">
                    {data.summary.maleMembers ?? 0}
                  </p>
                  <p className="mt-0.5 text-[7px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                    {metrics.members > 0 ? Math.round(((data.summary.maleMembers ?? 0) / metrics.members) * 100) : 0}%
                  </p>
                </div>
                
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Female</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-magenta)] sm:mt-1 sm:text-xl">
                    {data.summary.femaleMembers ?? 0}
                  </p>
                  <p className="mt-0.5 text-[7px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                    {metrics.members > 0 ? Math.round(((data.summary.femaleMembers ?? 0) / metrics.members) * 100) : 0}%
                  </p>
                </div>
                
                <div className="rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:scale-105 hover:border-[var(--aw-primary)] hover:shadow-md sm:p-3">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[var(--aw-muted)] sm:text-[10px]">Hibrets</p>
                  <p className="mt-0.5 text-base font-black text-[var(--aw-text)] sm:mt-1 sm:text-xl">{metrics.hibrets}</p>
                  <p className="mt-0.5 text-[7px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">Units</p>
                </div>
              </div>

              {/* Distribution Charts */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Gender Distribution - Pie Chart */}
                <div className="group rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:shadow-md sm:p-3">
                  <h4 className="mb-2 text-[10px] font-black text-[var(--aw-text)] sm:text-xs">Gender</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Male', value: data.summary.maleMembers },
                          { name: 'Female', value: data.summary.femaleMembers },
                        ].filter(item => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={38}
                        paddingAngle={2}
                        animationDuration={800}
                      >
                        <Cell fill="var(--aw-primary)" />
                        <Cell fill="var(--aw-magenta)" />
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} members`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 flex flex-col gap-1 sm:mt-2 sm:flex-row sm:justify-center sm:gap-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aw-primary)] sm:h-2 sm:w-2" />
                      <span className="text-[8px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                        M {metrics.members > 0 ? Math.round((data.summary.maleMembers / metrics.members) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aw-magenta)] sm:h-2 sm:w-2" />
                      <span className="text-[8px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                        F {metrics.members > 0 ? Math.round((data.summary.femaleMembers / metrics.members) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member Status - Pie Chart */}
                <div className="group rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:shadow-md sm:p-3">
                  <h4 className="mb-2 text-[10px] font-black text-[var(--aw-text)] sm:text-xs">Status</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: metrics.activeMembers },
                          { name: 'Candidate', value: metrics.candidateMembers },
                        ].filter(item => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={20}
                        outerRadius={38}
                        paddingAngle={2}
                        animationDuration={800}
                      >
                        <Cell fill="var(--aw-success)" />
                        <Cell fill="var(--aw-yellow)" />
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} members`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-1 flex flex-col gap-1 sm:mt-2 sm:flex-row sm:justify-center sm:gap-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aw-success)] sm:h-2 sm:w-2" />
                      <span className="text-[8px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                        Act {metrics.members > 0 ? Math.round((metrics.activeMembers / metrics.members) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--aw-yellow)] sm:h-2 sm:w-2" />
                      <span className="text-[8px] font-semibold text-[var(--aw-muted)] sm:text-[9px]">
                        Cand {metrics.members > 0 ? Math.round((metrics.candidateMembers / metrics.members) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Education Level - Bar Chart */}
                <div className="group rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:shadow-md sm:p-3">
                  <h4 className="mb-2 text-[10px] font-black text-[var(--aw-text)] sm:text-xs">Education</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart
                      data={
                        data.summary.educationDistribution
                          ? Object.entries(data.summary.educationDistribution)
                              .map(([name, value]) => ({ 
                                name: name.length > 8 ? name.slice(0, 8) + '.' : name, 
                                value 
                              }))
                              .sort((a, b) => b.value - a.value)
                              .slice(0, 3)
                          : []
                      }
                      margin={{ top: 5, right: 2, bottom: 25, left: 2 }}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 7, fill: 'var(--aw-muted)' }}
                        angle={-30}
                        textAnchor="end"
                        height={35}
                      />
                      <Tooltip cursor={{ fill: 'rgba(0,101,141,0.05)' }} />
                      <Bar 
                        dataKey="value" 
                        fill="var(--aw-primary)" 
                        radius={[3, 3, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Age Distribution - Bar Chart */}
                <div className="group rounded-xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-2 transition-all hover:shadow-md sm:p-3">
                  <h4 className="mb-2 text-[10px] font-black text-[var(--aw-text)] sm:text-xs">Age</h4>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart
                      data={
                        data.summary.ageDistribution
                          ? [
                              { name: '18-30', value: data.summary.ageDistribution['18-30'] || 0 },
                              { name: '31-45', value: data.summary.ageDistribution['31-45'] || 0 },
                              { name: '46+', value: data.summary.ageDistribution['46+'] || 0 },
                            ].filter(item => item.value > 0)
                          : []
                      }
                      margin={{ top: 5, right: 2, bottom: 25, left: 2 }}
                    >
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 8, fill: 'var(--aw-muted)' }}
                        height={30}
                      />
                      <Tooltip cursor={{ fill: 'rgba(0,101,141,0.05)' }} />
                      <Bar 
                        dataKey="value" 
                        fill="var(--aw-success)" 
                        radius={[3, 3, 0, 0]}
                        animationDuration={800}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <QuickActionsSidebar performanceData={performanceData} />
        </div>
      )}
    </div>
  );
}
