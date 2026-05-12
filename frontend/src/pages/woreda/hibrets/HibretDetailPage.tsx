import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit3,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Card, CardContent, CardHeader } from "@/components/ui/shadcn/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { statusToBadgeVariant } from "@/lib/badge";
import { readErrorMessage } from "@/lib/errors";
import {
  assignMembersToFamily,
  bulkUpdateHibretAccountStatus,
  createHibretFamily,
  deleteHibretFamily,
  getWoredaHibret,
  unassignMembersFromFamily,
  updateHibretAccountStatus,
  updateHibretFamily,
} from "../../../services/woredaHibretService";
import type {
  FamilyPayload,
  WoredaHibretDetail,
  WoredaHibretDirective,
  WoredaHibretFamily,
} from "../../../services/woredaHibretService";
import { useWoredaHibretDetailHeaderStore } from "../../../stores/woredaHibretDetailHeaderStore";
import { HibretAdministrativeMembersPage } from "./HibretAdministrativeMembersPage";

type Side = "political" | "administrative";
type PoliticalTab = "meeting" | "conference" | "trend_report" | "other";
type AdministrativeTab = "members" | "families";

const politicalTabs: Array<{ key: PoliticalTab; label: string }> = [
  { key: "meeting", label: "Meetings" },
  { key: "conference", label: "Conferences" },
  { key: "trend_report", label: "Trend Reports" },
  { key: "other", label: "Other" },
];

const administrativeTabs: Array<{ key: AdministrativeTab; label: string }> = [
  { key: "members", label: "Members" },
  { key: "families", label: "Families" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = status || "unknown";
  return (
    <Badge variant={statusToBadgeVariant(value)} className="uppercase">
      {value}
    </Badge>
  );
}

function directiveTypeLabel(value: string) {
  if (value === "meeting") return "Meeting";
  if (value === "conference") return "Conference";
  if (value === "trend_report") return "Trend Report";
  return "Other";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function HibretAdministrativeNav({
  activeTab,
  onTabChange,
}: {
  activeTab: AdministrativeTab;
  onTabChange: (tab: AdministrativeTab) => void;
}) {
  return (
    <div className="aw-hibret-admin-toolbar-cluster">
      <Link to="/woreda/hibrets" className="aw-hibret-detail-back-button">
        <ArrowLeft size={16} aria-hidden />
        Back to Hibrets
      </Link>
      <div className="flex flex-wrap gap-2">
        {administrativeTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={[
              "aw-hibret-detail-tab",
              activeTab === tab.key ? "is-active" : "",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HibretDetailPage() {
  const { hibretId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const side: Side =
    searchParams.get("side") === "political" ? "political" : "administrative";

  const [hibret, setHibret] = useState<WoredaHibretDetail | null>(null);
  const [politicalTab, setPoliticalTab] = useState<PoliticalTab>("meeting");
  const [administrativeTab, setAdministrativeTab] =
    useState<AdministrativeTab>("members");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasLoadedRef = useRef(false);

  const loadHibret = useCallback(async () => {
    if (!hibretId) return;

    const isInitialLoad = !hasLoadedRef.current;

    if (isInitialLoad) {
      setIsLoading(true);
    }

    setError("");

    try {
      const data = await getWoredaHibret(hibretId);
      setHibret(data);
      hasLoadedRef.current = true;
    } catch {
      const msg = "Unable to load Hibret detail.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [hibretId]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [hibretId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHibret();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadHibret]);

  const setHibretDetailHeaderTitle = useWoredaHibretDetailHeaderStore(
    (s) => s.setDetailTitle,
  );

  useEffect(() => {
    setHibretDetailHeaderTitle(null);
    return () => setHibretDetailHeaderTitle(null);
  }, [hibretId, setHibretDetailHeaderTitle]);

  useEffect(() => {
    if (hibret && hibret.id === hibretId && hibret.name) {
      setHibretDetailHeaderTitle(hibret.name);
    }
  }, [hibret, hibretId, setHibretDetailHeaderTitle]);

  const politicalDirectives = useMemo(() => {
    return (hibret?.directives ?? []).filter(
      (directive) => directive.type === politicalTab,
    );
  }, [hibret?.directives, politicalTab]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-muted-foreground">
            Loading Hibret detail.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !hibret) {
    return (
      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!hibret) {
    return (
      <Card>
        <CardContent className="px-5 py-5">
          <p className="text-sm text-muted-foreground">Hibret not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="aw-hibret-detail-page aw-mobile-natural-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="aw-hibret-detail-panel flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        {side === "political" ? (
          <div className="aw-hibret-detail-toolbar shrink-0 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Link
                to="/woreda/hibrets"
                className="aw-hibret-detail-back-button w-fit"
              >
                <ArrowLeft size={16} aria-hidden />
                Back to Hibrets
              </Link>
              <div className="flex flex-wrap gap-2">
                {politicalTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setPoliticalTab(tab.key)}
                    className={[
                      "aw-hibret-detail-tab",
                      politicalTab === tab.key ? "is-active" : "",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {side === "political" ? (
          <div className="aw-hibret-detail-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <PoliticalWorkspace
              hibret={hibret}
              directiveType={politicalTab}
              directives={politicalDirectives}
              returnTo={`${location.pathname}${location.search}`}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <AdministrativeWorkspace
              hibret={hibret}
              hibretId={hibretId}
              activeTab={administrativeTab}
              onAdministrativeTabChange={setAdministrativeTab}
              onReload={loadHibret}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PoliticalWorkspace({
  hibret,
  directiveType,
  directives,
  returnTo,
}: {
  hibret: WoredaHibretDetail;
  directiveType: PoliticalTab;
  directives: WoredaHibretDirective[];
  returnTo: string;
}) {
  const submitted = directives.filter(
    (directive) => directive.report?.submittedAt,
  ).length;
  const pending = directives.length - submitted;
  const reviewed = directives.filter(
    (directive) => directive.report?.reviewDecision,
  ).length;

  return (
    <section className="aw-hibret-political-workspace flex min-h-0 flex-1 flex-col gap-4">
      <div className="stat-grid">
        <MiniMetric
          label={`${directiveTypeLabel(directiveType)} directives`}
          value={directives.length}
        />
        <MiniMetric
          label="Submitted reports"
          value={submitted}
          tone="success"
        />
        <MiniMetric label="Pending reports" value={pending} tone="magenta" />
        <MiniMetric label="Reviewed" value={reviewed} tone="primary" />
      </div>

      <div className="aw-hibret-section-heading">
        <p>Political workstream</p>
        <h2>{directiveTypeLabel(directiveType)} work</h2>
        <span>
          Targeted directives, Hibret reports, report media, and Woreda review
          links.
        </span>
      </div>

      <div className="aw-hibret-political-table-wrap">
        <table className="aw-hibret-political-table">
          <thead className="sticky top-0 z-10 bg-[var(--aw-surface-muted)] text-xs uppercase tracking-wide text-[var(--aw-muted)]">
            <tr>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                Directive
              </th>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                Status
              </th>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                Deadline
              </th>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                Report
              </th>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                Review
              </th>
              <th className="border-b border-[var(--aw-border)]/60 px-4 py-3 text-right">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {directives.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <EmptyMessage
                    message={`No ${directiveTypeLabel(directiveType).toLowerCase()} directives assigned to this Hibret.`}
                  />
                </td>
              </tr>
            ) : (
              directives.map((directive) => (
                <tr
                  key={directive.id}
                  className="hover:bg-[var(--aw-surface-muted)]"
                >
                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <p className="font-bold text-[var(--aw-text)]">
                      {directive.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                      Assigned {formatDate(directive.assignedAt)}
                    </p>
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <StatusBadge status={directive.status} />
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4 text-[var(--aw-muted)]">
                    {formatDate(directive.deadline)}
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <StatusBadge
                      status={
                        directive.report?.status ||
                        (directive.status === "closed"
                          ? "Unsubmitted"
                          : "Pending")
                      }
                    />
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <StatusBadge
                      status={
                        directive.report?.reviewDecision ||
                        (directive.status === "closed"
                          ? "Unsubmitted"
                          : "Pending")
                      }
                    />
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4 text-right">
                    {directive.report?.submittedAt ? (
                      <Button asChild variant="link" size="sm">
                        <Link
                          to={`/woreda/announcements/${directive.id}/hibrets/${hibret.id}/report?returnTo=${encodeURIComponent(returnTo)}`}
                        >
                          Open Report
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {directive.status === "closed"
                          ? "Unsubmitted"
                          : "Pending"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdministrativeWorkspace({
  hibret,
  hibretId,
  activeTab,
  onAdministrativeTabChange,
  onReload,
}: {
  hibret: WoredaHibretDetail;
  hibretId?: string;
  activeTab: AdministrativeTab;
  onAdministrativeTabChange: (tab: AdministrativeTab) => void;
  onReload: () => Promise<void>;
}) {
  const adminNav = (
    <HibretAdministrativeNav
      activeTab={activeTab}
      onTabChange={onAdministrativeTabChange}
    />
  );

  if (activeTab === "families") {
    return (
      <div className="member-registry-page aw-member-registry flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <div className="member-registry-control-bar">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              {adminNav}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <FamiliesPanel hibret={hibret} onReload={onReload} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <HibretAdministrativeMembersPage
        hibretId={hibretId || hibret.id}
        controlBarLeading={adminNav}
      />
    </div>
  );
}

function AccountBulkToolbar({
  selectedCount,
  disabled,
  onDisable,
  onReactivate,
  onPending,
  onClear,
}: {
  selectedCount: number;
  disabled: boolean;
  onDisable: () => void;
  onReactivate: () => void;
  onPending: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded border border-[var(--aw-border)]/70 bg-[var(--aw-surface-muted)] px-4 py-3 md:flex-row md:items-center md:justify-between">
      <p className="text-sm font-bold text-[var(--aw-text)]">
        {selectedCount} selected
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={disabled || selectedCount === 0}
          onClick={onDisable}
        >
          Disable Selected
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selectedCount === 0}
          onClick={onReactivate}
        >
          Reactivate Selected
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || selectedCount === 0}
          onClick={onPending}
        >
          Mark Pending
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={selectedCount === 0}
          onClick={onClear}
        >
          Clear Selection
        </Button>
      </div>
    </div>
  );
}

export function AdminsPanel({
  hibret,
  onReload,
}: {
  hibret: WoredaHibretDetail;
  onReload: () => Promise<void>;
}) {
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [accountStatusFilter, setAccountStatusFilter] = useState("");

  const admins = hibret.admins.filter((admin) => admin.role === "HIBRET_ADMIN");
  const filteredAdmins = accountStatusFilter
    ? admins.filter((admin) => admin.status === accountStatusFilter)
    : admins;
  const isBulkBusy = busyUserId === "bulk";

  function toggleSelected(userId: string) {
    setSelectedAdminIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  async function changeStatus(
    userId: string,
    status: "ACTIVE" | "DISABLED" | "PENDING_SETUP",
  ) {
    setBusyUserId(userId);

    try {
      const result = await updateHibretAccountStatus(hibret.id, userId, status);
      toast.success(result.message);
      await onReload();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to update account.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function bulkChangeStatus(
    status: "ACTIVE" | "DISABLED" | "PENDING_SETUP",
  ) {
    if (selectedAdminIds.length === 0) return;

    setBusyUserId("bulk");

    try {
      const result = await bulkUpdateHibretAccountStatus(
        hibret.id,
        selectedAdminIds,
        status,
      );
      toast.success(`${result.message} Updated: ${result.updated}.`);
      setSelectedAdminIds([]);
      await onReload();
    } catch (err) {
      toast.error(
        readErrorMessage(err) || "Unable to update selected accounts.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid shrink-0 gap-4 md:grid-cols-3">
        <AdminSmallMetric label="Admins" value={admins.length} />
        <AdminSmallMetric
          label="Active accounts"
          value={admins.filter((admin) => admin.status === "ACTIVE").length}
          tone="success"
        />
        <AdminSmallMetric
          label="Pending setup"
          value={
            admins.filter((admin) => admin.status === "PENDING_SETUP").length
          }
          tone="magenta"
        />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <SectionHeader
            title="Hibret admins"
            description="Administrator accounts assigned to manage this Hibret."
            count={filteredAdmins.length}
          />

          <div className="w-full md:min-w-[12rem]">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Account status
            </Label>
            <Select
              value={accountStatusFilter || "ALL"}
              onValueChange={(value) => {
                setAccountStatusFilter(value === "ALL" ? "" : value);
                setSelectedAdminIds([]);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING_SETUP">Pending setup</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AccountBulkToolbar
          selectedCount={selectedAdminIds.length}
          disabled={isBulkBusy}
          onDisable={() => bulkChangeStatus("DISABLED")}
          onReactivate={() => bulkChangeStatus("ACTIVE")}
          onPending={() => bulkChangeStatus("PENDING_SETUP")}
          onClear={() => setSelectedAdminIds([])}
        />
      </div>

      {filteredAdmins.length === 0 ? (
        <EmptyMessage message="No Hibret admins match this filter." />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-[var(--aw-border)]/70 bg-[var(--aw-surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--aw-surface-muted)] text-xs uppercase tracking-wide text-[var(--aw-muted)]">
              <tr>
                <th className="w-12 border-b border-[var(--aw-border)]/60 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredAdmins.length > 0 &&
                      filteredAdmins.every((admin) =>
                        selectedAdminIds.includes(admin.id),
                      )
                    }
                    onChange={(event) => {
                      setSelectedAdminIds(
                        event.target.checked
                          ? filteredAdmins.map((admin) => admin.id)
                          : [],
                      );
                    }}
                    className="h-4 w-4"
                  />
                </th>
                <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                  Admin
                </th>
                <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                  Account
                </th>
                <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                  Last login
                </th>
                <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                  Created
                </th>
                <th className="border-b border-[var(--aw-border)]/60 px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredAdmins.map((admin) => (
                <tr
                  key={admin.id}
                  className="transition hover:bg-[var(--aw-primary-soft)]/40"
                >
                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedAdminIds.includes(admin.id)}
                      onChange={() => toggleSelected(admin.id)}
                      className="h-4 w-4"
                    />
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]">
                        <ShieldCheck size={18} />
                      </div>
                      <p className="font-bold text-[var(--aw-text)]">
                        {admin.email}
                      </p>
                    </div>
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4">
                    <StatusBadge status={admin.status} />
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4 text-sm font-semibold text-[var(--aw-muted)]">
                    {formatDate(admin.lastLoginAt)}
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4 text-sm font-semibold text-[var(--aw-muted)]">
                    {formatDate(admin.createdAt)}
                  </td>

                  <td className="border-b border-[var(--aw-border-soft)] px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {admin.status === "DISABLED" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyUserId === admin.id}
                          onClick={() => changeStatus(admin.id, "ACTIVE")}
                        >
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={busyUserId === admin.id}
                          onClick={() => changeStatus(admin.id, "DISABLED")}
                        >
                          Disable
                        </Button>
                      )}

                      {admin.status !== "PENDING_SETUP" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busyUserId === admin.id}
                          onClick={() =>
                            changeStatus(admin.id, "PENDING_SETUP")
                          }
                        >
                          Mark Pending
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FamiliesPanel({
  hibret,
  onReload,
}: {
  hibret: WoredaHibretDetail;
  onReload: () => Promise<void>;
}) {
  const [selectedFamily, setSelectedFamily] =
    useState<WoredaHibretFamily | null>(hibret.families[0] ?? null);
  const [isFamilyFormOpen, setIsFamilyFormOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<WoredaHibretFamily | null>(
    null,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const currentFamily =
    hibret.families.find((family) => family.id === selectedFamily?.id) ??
    hibret.families[0] ??
    null;

  const unassignedMembers = useMemo(() => {
    const query = unassignedSearch.trim().toLowerCase();

    return hibret.members
      .filter((member) => !member.familyId)
      .filter((member) => {
        if (!query) return true;
        return [
          member.name,
          member.memberCode,
          member.fanId,
          member.ppId,
          member.phone,
          member.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [hibret.members, unassignedSearch]);

  const familyMembers = currentFamily
    ? hibret.members.filter((member) => member.familyId === currentFamily.id)
    : [];

  const membersInFamilies = hibret.members.filter(
    (member) => member.familyId,
  ).length;
  const inactiveFamilies = hibret.families.filter(
    (family) => family.status === "inactive",
  ).length;

  function openCreateFamily() {
    setEditingFamily(null);
    setIsFamilyFormOpen(true);
  }

  function openEditFamily(family: WoredaHibretFamily) {
    setEditingFamily(family);
    setIsFamilyFormOpen(true);
  }

  async function handleSaveFamily(payload: FamilyPayload) {
    setIsBusy(true);

    try {
      if (editingFamily) {
        await updateHibretFamily(hibret.id, editingFamily.id, payload);
        toast.success("Family updated.");
      } else {
        const family = await createHibretFamily(hibret.id, payload);
        setSelectedFamily(family);
        toast.success("Family created.");
      }

      setIsFamilyFormOpen(false);
      setEditingFamily(null);
      await onReload();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to save family.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteFamily(family: WoredaHibretFamily) {
    const confirmed = window.confirm(
      family.memberCount > 0
        ? "This family has members. It will be marked inactive. Continue?"
        : "Delete this empty family?",
    );

    if (!confirmed) return;

    setIsBusy(true);

    try {
      const result = await deleteHibretFamily(hibret.id, family.id);
      toast.success(result.message);
      setSelectedFamily(null);
      await onReload();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to remove family.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAssignMembers() {
    if (!currentFamily || selectedMemberIds.length === 0) return;

    setIsBusy(true);

    try {
      const result = await assignMembersToFamily(
        hibret.id,
        currentFamily.id,
        selectedMemberIds,
      );
      toast.success(
        `${result.assigned} members assigned to ${currentFamily.name}.`,
      );
      setSelectedMemberIds([]);
      await onReload();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to assign members.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUnassignMembers(memberIds: string[]) {
    if (memberIds.length === 0) return;

    setIsBusy(true);

    try {
      const result = await unassignMembersFromFamily(hibret.id, memberIds);
      toast.success(`${result.unassigned} members removed from family.`);
      await onReload();
    } catch (err) {
      toast.error(
        readErrorMessage(err) || "Unable to remove members from family.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function toggleMember(memberId: string) {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  return (
    <section className="space-y-5">
      <div className="stat-grid">
        <AdminSmallMetric label="Families" value={hibret.families.length} />
        <AdminSmallMetric
          label="Active"
          value={hibret.families.length - inactiveFamilies}
          tone="success"
        />
        <AdminSmallMetric
          label="Members in families"
          value={membersInFamilies}
          tone="primary"
        />
        <AdminSmallMetric
          label="Unassigned members"
          value={hibret.members.length - membersInFamilies}
          tone="magenta"
        />
      </div>

      <div className="grid min-h-[var(--aw-panel-min-h)] gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-[var(--aw-border)]/70 bg-[var(--aw-surface-muted)] shadow-none">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--aw-border)]/60 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--aw-text)]">
                Family list
              </h2>
              <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                Showing {hibret.families.length} families
              </p>
            </div>

            <Button
              type="button"
              variant="default"
              size="default"
              onClick={openCreateFamily}
            >
              <Plus aria-hidden />
              Create Family
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {hibret.families.length === 0 ? (
              <EmptyMessage message="No families recorded yet." />
            ) : (
              <div className="space-y-3">
                {hibret.families.map((family) => {
                  const isSelected = currentFamily?.id === family.id;

                  return (
                    <button
                      key={family.id}
                      type="button"
                      onClick={() => setSelectedFamily(family)}
                      className={[
                        "w-full rounded-2xl border p-4 text-left transition hover:border-[var(--aw-primary)]/70 hover:bg-[var(--aw-primary-soft)]/30",
                        isSelected
                          ? "border-[var(--aw-primary)] bg-[var(--aw-primary-soft)]/50 shadow-none"
                          : "border-[var(--aw-border)]/70 bg-[var(--aw-surface)]",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-[var(--aw-text)]">
                            {family.name}
                          </p>
                          <p className="mt-2 text-xs font-bold text-[var(--aw-muted)]">
                            {family.memberCount} members
                          </p>
                        </div>

                        <StatusBadge status={family.status || "unknown"} />
                      </div>

                      <div className="mt-4 space-y-2 text-xs font-semibold text-[var(--aw-muted)]">
                        <p className="flex items-center gap-2">
                          <UserRound size={14} />
                          <span>
                            {family.contactName || "No contact recorded"}
                          </span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone size={14} />
                          <span>{family.phone || "No phone recorded"}</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="min-h-0 space-y-5">
          {currentFamily ? (
            <article className="rounded-3xl border border-[var(--aw-border)]/70 bg-[var(--aw-surface-muted)] p-5 shadow-none">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-[var(--aw-text)]">
                      {currentFamily.name}
                    </h3>
                    <StatusBadge status={currentFamily.status || "unknown"} />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">
                    {familyMembers.length} members
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    disabled={isBusy}
                    onClick={() => openEditFamily(currentFamily)}
                  >
                    <Edit3 aria-hidden />
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    size="default"
                    disabled={isBusy}
                    onClick={() => handleDeleteFamily(currentFamily)}
                  >
                    <Trash2 aria-hidden />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="stat-grid mt-5">
                <AdminInfo
                  label="Contact"
                  value={currentFamily.contactName || "-"}
                />
                <AdminInfo label="Phone" value={currentFamily.phone || "-"} />
                <AdminInfo
                  label="Created"
                  value={formatDate(currentFamily.createdAt)}
                />
              </div>
            </article>
          ) : (
            <EmptyMessage message="Select a family or create one." />
          )}

          <section className="overflow-hidden rounded-3xl border border-[var(--aw-border)]/70 bg-[var(--aw-surface)] shadow-none">
            <div className="border-b border-[var(--aw-border)]/60 bg-[var(--aw-surface-muted)] px-5 py-4">
              <h3 className="text-base font-bold text-[var(--aw-text)]">
                Members in selected family
              </h3>
            </div>

            <div className="max-h-[min(20rem,calc(var(--aw-viewport-block)-18rem))] overflow-auto">
              {!currentFamily || familyMembers.length === 0 ? (
                <div className="p-4">
                  <EmptyMessage message="No members in this family." />
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--aw-surface-muted)] text-xs uppercase tracking-wide text-[var(--aw-muted)]">
                    <tr>
                      <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                        Member
                      </th>
                      <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                        Contact
                      </th>
                      <th className="border-b border-[var(--aw-border)]/60 px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="transition hover:bg-[var(--aw-primary-soft)]/40"
                      >
                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[var(--aw-primary)]/20 bg-[var(--aw-primary-soft)] text-xs font-black text-[var(--aw-primary)]">
                              {initials(member.name) || "M"}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--aw-text)]">
                                {member.name}
                              </p>
                              <p className="text-xs text-[var(--aw-muted)]">
                                {member.memberCode || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3 text-xs font-semibold text-[var(--aw-muted)]">
                          <p>{member.phone || "-"}</p>
                          <p>{member.email || "-"}</p>
                        </td>

                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleUnassignMembers([member.id])}
                          >
                            Unassign
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[var(--aw-border)]/70 bg-[var(--aw-surface)] shadow-none">
            <div className="flex flex-col gap-3 border-b border-[var(--aw-border)]/60 bg-[var(--aw-surface-muted)] px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--aw-text)]">
                  Unassigned members
                </h3>
                <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                  Select members and assign them to the selected family.
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <div className="relative w-full md:max-w-[18rem]">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={unassignedSearch}
                    onChange={(event) =>
                      setUnassignedSearch(event.target.value)
                    }
                    placeholder="Search members"
                    className="pl-9"
                  />
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="default"
                  disabled={
                    isBusy || !currentFamily || selectedMemberIds.length === 0
                  }
                  onClick={handleAssignMembers}
                >
                  Assign Selected
                </Button>
              </div>
            </div>

            <div className="max-h-[min(18.75rem,calc(var(--aw-viewport-block)-20rem))] overflow-auto">
              {unassignedMembers.length === 0 ? (
                <div className="p-6">
                  <div className="rounded border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-4 py-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded border border-[var(--aw-border)] bg-[var(--aw-surface)] text-[var(--aw-muted)]">
                      <UsersIcon />
                    </div>
                    <p className="mt-3 text-sm font-bold text-[var(--aw-muted)]">
                      No unassigned members found.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--aw-surface-muted)] text-xs uppercase tracking-wide text-[var(--aw-muted)]">
                    <tr>
                      <th className="w-10 border-b border-[var(--aw-border)]/60 px-4 py-3"></th>
                      <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                        Member
                      </th>
                      <th className="border-b border-[var(--aw-border)]/60 px-4 py-3">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedMembers.map((member) => (
                      <tr
                        key={member.id}
                        className="transition hover:bg-[var(--aw-primary-soft)]/40"
                      >
                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.includes(member.id)}
                            onChange={() => toggleMember(member.id)}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3">
                          <p className="font-bold text-[var(--aw-text)]">
                            {member.name}
                          </p>
                          <p className="text-xs text-[var(--aw-muted)]">
                            {member.memberCode || "-"}
                          </p>
                        </td>
                        <td className="border-b border-[var(--aw-border-soft)] px-4 py-3 text-xs text-[var(--aw-muted)]">
                          <p>{member.phone || "-"}</p>
                          <p>{member.email || "-"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </section>
      </div>

      <FamilyFormModal
        key={isFamilyFormOpen ? (editingFamily?.id ?? "new") : "closed"}
        isOpen={isFamilyFormOpen}
        family={editingFamily}
        isSaving={isBusy}
        onClose={() => {
          setIsFamilyFormOpen(false);
          setEditingFamily(null);
        }}
        onSubmit={handleSaveFamily}
      />
    </section>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FamilyFormModal({
  isOpen,
  family,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  family: WoredaHibretFamily | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: FamilyPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FamilyPayload>(() => ({
    name: family?.name || "",
    contactName: family?.contactName || "",
    phone: family?.phone || "",
    status: family?.status || "active",
  }));
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setLocalError("Family name is required.");
      return;
    }

    await onSubmit({
      name: form.name.trim(),
      contactName: form.contactName?.trim() || null,
      phone: form.phone?.trim() || null,
      status: form.status || "active",
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-woreda-overlayScrim p-4">
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-form-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--aw-border)] bg-[var(--aw-surface)] shadow-none"
      >
        <div className="flex items-start justify-between border-b border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--aw-muted)]">
              Family record
            </p>
            <h2
              id="family-form-title"
              className="mt-1 text-xl font-bold text-[var(--aw-text)]"
            >
              {family ? "Edit Family" : "Create Family"}
            </h2>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close family form"
          >
            <X aria-hidden />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          {localError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {localError}
            </div>
          ) : null}

          <TextInput
            label="Family name"
            value={form.name}
            onChange={(value) =>
              setForm((current) => ({ ...current, name: value }))
            }
            required
          />

          <TextInput
            label="Contact name"
            value={form.contactName || ""}
            onChange={(value) =>
              setForm((current) => ({ ...current, contactName: value }))
            }
          />

          <TextInput
            label="Phone"
            value={form.phone || ""}
            onChange={(value) =>
              setForm((current) => ({ ...current, phone: value }))
            }
          />

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={form.status || "active"}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--aw-border)] bg-[var(--aw-surface-muted)] px-5 py-4">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="default"
            size="default"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Family"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function AdminSmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "success" | "magenta";
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AdminInfo({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "success" | "magenta";
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[var(--aw-border)] bg-[var(--aw-surface)] px-4 py-8 text-center text-sm font-semibold text-[var(--aw-muted)]">
      {message}
    </div>
  );
}
