import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createHibret,
  getWoredaHibrets,
} from "../../../services/woredaHibretService";
import type { WoredaHibretListItem } from "../../../services/woredaHibretService";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { statusToBadgeVariant } from "@/lib/badge";

type SortOrder =
  | "name"
  | "members_desc"
  | "members_asc"
  | "pending_desc"
  | "submitted_desc";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: "primary" | "success" | "warning" | "magenta";
}) {
  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-4 pt-0">
        <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function StatusPill({ value }: { value?: string | null }) {
  const normalized = value || "active";

  return (
    <Badge variant={statusToBadgeVariant(normalized)} className="uppercase">
      {normalized}
    </Badge>
  );
}

export function HibretsPage() {
  const [hibrets, setHibrets] = useState<WoredaHibretListItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("name");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  async function loadHibrets() {
    setIsLoading(true);

    try {
      const data = await getWoredaHibrets();
      setHibrets(data);
    } catch {
      toast.error("Unable to load Hibrets.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadHibrets();
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const filteredHibrets = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = hibrets.filter((hibret) => {
      return !query || hibret.name.toLowerCase().includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (sortOrder === "members_desc") return b.memberCount - a.memberCount;
      if (sortOrder === "members_asc") return a.memberCount - b.memberCount;
      if (sortOrder === "pending_desc") {
        return (b.pendingReports || 0) - (a.pendingReports || 0);
      }
      if (sortOrder === "submitted_desc") {
        return (b.submittedReports || 0) - (a.submittedReports || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [hibrets, searchText, sortOrder]);

  const summary = useMemo(() => {
    const total = hibrets.length;
    const totalMembers = hibrets.reduce(
      (sum, hibret) => sum + hibret.memberCount,
      0,
    );
    const pendingReports = hibrets.reduce(
      (sum, hibret) => sum + (hibret.pendingReports || 0),
      0,
    );
    const submittedReports = hibrets.reduce(
      (sum, hibret) => sum + (hibret.submittedReports || 0),
      0,
    );

    return {
      total,
      totalMembers,
      pendingReports,
      submittedReports,
    };
  }, [hibrets]);

  useEffect(() => {
    setPage(1);
  }, [searchText, sortOrder, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredHibrets.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedHibrets = filteredHibrets.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function resetForm() {
    setNewName("");
    setCreateError("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newName.trim();

    if (!name) {
      setCreateError("Hibret name is required.");
      return;
    }

    setIsSaving(true);
    setCreateError("");

    try {
      await createHibret({
        name,
        description: null,
        status: "active",
      });

      resetForm();
      setIsCreateOpen(false);
      await loadHibrets();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "Unable to create Hibret.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="aw-hibrets-page aw-mobile-natural-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-stretch">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Hibrets"
            value={summary.total}
            sub="Registered units"
          />
          <StatCard
            label="Members"
            value={summary.totalMembers}
            sub="Across all Hibrets"
            tone="success"
          />
          <StatCard
            label="Submitted"
            value={summary.submittedReports}
            sub="Reports received"
            tone="primary"
          />
          <StatCard
            label="Pending"
            value={summary.pendingReports}
            sub="Reports not submitted"
            tone="magenta"
          />
        </div>

        <Button
          type="button"
          variant="default"
          size="default"
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
        >
          <Plus aria-hidden />
          New Hibret
        </Button>
      </div>

      <div className="aw-hibret-list-panel">
        <div className="aw-hibret-list-header">
          <div className="min-w-0">
            <p className="aw-hibret-eyebrow">Community administration</p>
            <h2 className="aw-hibret-list-title">All Hibrets</h2>
            <p className="aw-hibret-list-sub">
              Showing {filteredHibrets.length} of {hibrets.length} records
            </p>
          </div>

          <div className="aw-hibret-filter-shell">
            <div className="aw-hibret-search">
              <Search size={16} className="shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Hibret name..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                aria-label="Search Hibrets by name"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="default"
              className="md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
            >
              <SlidersHorizontal aria-hidden />
              Filters
            </Button>

            <div
              className={[
                "aw-hibret-select-wrap",
                mobileFiltersOpen ? "is-open" : "",
              ].join(" ")}
            >
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
              >
                <option value="name">Sort by name</option>
                <option value="members_desc">Members high to low</option>
                <option value="members_asc">Members low to high</option>
                <option value="submitted_desc">Submitted reports</option>
                <option value="pending_desc">Pending reports</option>
              </select>
            </div>
          </div>
        </div>

        <div className="aw-hibret-table-scroll hidden md:block">
          <table className="aw-hibret-table">
            <thead>
              <tr>
                <th className="w-14">#</th>
                <th>Hibret</th>
                <th className="text-right">Members</th>
                 <th className="text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    Loading Hibrets.
                  </td>
                </tr>
              ) : filteredHibrets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--aw-primary)] bg-[color:color-mix(in_srgb,var(--aw-primary)_12%,var(--aw-surface))] text-[var(--aw-primary)]">
                        <Building2 size={24} />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-[var(--aw-text)]">
                        No Hibrets found
                      </h3>
                      <p className="mt-2 text-sm font-semibold text-[var(--aw-muted)]">
                        Adjust search or create a new Hibret.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHibrets.map((hibret, index) => (
                  <tr key={hibret.id}>
                    <td className="font-black text-[var(--aw-muted)]">
                      {(safePage - 1) * pageSize + index + 1}
                    </td>

                    <td>
                      <Link
                        to={`/woreda/hibrets/${hibret.id}?side=administrative`}
                        className="aw-hibret-name-link"
                      >
                        {hibret.name}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                        {hibret.familyCount || 0} families · {hibret.adminCount || 0} admins
                      </p>
                    </td>

                    <td className="text-right font-black text-[var(--aw-text)]">
                      {hibret.memberCount}
                    </td>

                    <td>
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/woreda/hibrets/${hibret.id}?side=political`}
                          className="aw-hibret-action aw-hibret-action--ghost"
                        >
                          Political
                        </Link>

                        <Link
                          to={`/woreda/hibrets/${hibret.id}?side=administrative`}
                          className="aw-hibret-action aw-hibret-action--primary"
                        >
                          Administrative
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="aw-hibret-mobile-list md:hidden">
          {isLoading ? (
            <div className="aw-hibret-mobile-empty">Loading Hibrets.</div>
          ) : filteredHibrets.length === 0 ? (
            <div className="aw-hibret-mobile-empty">
              <h3>No Hibrets found</h3>
              <p>Adjust search or create a new Hibret.</p>
            </div>
          ) : (
            paginatedHibrets.map((hibret) => (
              <article key={hibret.id} className="aw-hibret-mobile-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/woreda/hibrets/${hibret.id}?side=administrative`}
                      className="aw-hibret-mobile-title"
                    >
                      {hibret.name}
                    </Link>
                    <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                      {hibret.familyCount || 0} families · {hibret.adminCount || 0} admins
                    </p>
                  </div>

                  <StatusPill value={hibret.status} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniMobileMetric label="Members" value={hibret.memberCount} />
                  <MiniMobileMetric label="Submitted" value={hibret.submittedReports || 0} />
                  <MiniMobileMetric label="Pending" value={hibret.pendingReports || 0} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to={`/woreda/hibrets/${hibret.id}?side=political`}
                    className="aw-hibret-mobile-action"
                  >
                    Political
                  </Link>
                  <Link
                    to={`/woreda/hibrets/${hibret.id}?side=administrative`}
                    className="aw-hibret-mobile-action is-primary"
                  >
                    Administrative
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="aw-hibret-pagination">
          <span>
            Page {safePage} of {totalPages} · {filteredHibrets.length} total
          </span>

          <div className="aw-hibret-pagination-controls">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft aria-hidden />
              Previous
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      {isCreateOpen
        ? createPortal(
            <CreateHibretDrawer
              newName={newName}
              setNewName={setNewName}
              createError={createError}
              isSaving={isSaving}
              onClose={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              onSubmit={handleCreate}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

function MiniMobileMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="aw-hibret-mobile-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function CreateHibretDrawer({
  newName,
  setNewName,
  createError,
  isSaving,
  onClose,
  onSubmit,
}: {
  newName: string;
  setNewName: (value: string) => void;
  createError: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="aw-hibret-drawer-root" role="presentation">
      <div className="aw-hibret-drawer-scrim" onClick={onClose} aria-hidden />

      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="hibret-create-title"
        onSubmit={onSubmit}
        className="aw-hibret-drawer"
      >
        <div className="aw-hibret-drawer-header">
          <div className="min-w-0">
            <p>Community administration</p>
            <h2 id="hibret-create-title">New Hibret</h2>
            <span>Create a Hibret record under Woreda administration.</span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClose}
            aria-label="Close create Hibret form"
          >
            <X aria-hidden />
          </Button>
        </div>

        <div className="aw-hibret-drawer-body">
          {createError ? (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createError}
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hibret-name">Hibret name</Label>
            <Input
              id="hibret-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Enter Hibret name"
              autoFocus
            />
          </div>
        </div>

        <div className="aw-hibret-drawer-footer">
          <Button type="button" variant="outline" size="default" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="default" size="default" disabled={isSaving}>
            {isSaving ? "Saving..." : "Create Hibret"}
          </Button>
        </div>
      </form>
    </div>
  );
}
