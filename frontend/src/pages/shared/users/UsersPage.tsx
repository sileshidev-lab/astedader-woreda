import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  bulkUpdateManagedUsers,
  getManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
} from "../../../services/userService";
import {
  AdminMetricCard,
  AdminSectionPanel,
} from "../../../components/ui/AdminPagePrimitives";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { statusToBadgeVariant } from "@/lib/badge";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function memberName(user: ManagedUser) {
  return user.memberName || "Member account";
}

export function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, disabled: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadUsers() {
    setLoading(true);

    try {
      const data = await getManagedUsers({
        search: search || undefined,
        status: status || undefined,
        role: "MEMBER",
      });

      const memberUsers = data.users.filter((user) => user.role === "MEMBER");
      setUsers(memberUsers);
      setSummary({
        total: memberUsers.length,
        active: memberUsers.filter((user) => user.status === "ACTIVE").length,
        pending: memberUsers.filter((user) => user.status === "PENDING_SETUP").length,
        disabled: memberUsers.filter((user) => user.status === "DISABLED").length,
      });
      setSelected([]);
    } catch (err) {
      console.error(err);
      toast.error("Unable to load member users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search, status]);

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = users.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedCount = selected.length;

  const allVisibleSelected = useMemo(() => {
    return paginatedUsers.length > 0 && paginatedUsers.every((user) => selected.includes(user.id));
  }, [paginatedUsers, selected]);

  function toggleUser(userId: string) {
    setSelected((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  }

  function toggleAll() {
    setSelected(
      allVisibleSelected
        ? selected.filter((id) => !paginatedUsers.some((user) => user.id === id))
        : [...new Set([...selected, ...paginatedUsers.map((user) => user.id)])],
    );
  }

  function readErrorMessage(err: unknown): string | undefined {
    const value = err as { response?: { data?: { message?: unknown } } } | null | undefined;
    const message = value?.response?.data?.message;
    return typeof message === "string" ? message : undefined;
  }

  async function updateOne(userId: string, nextStatus: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    try {
      await updateManagedUserStatus(userId, nextStatus);
      toast.success("Member user updated.");
      await loadUsers();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to update member user.");
    }
  }

  async function updateSelected(nextStatus: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    if (!selected.length) return;
    try {
      await bulkUpdateManagedUsers(selected, nextStatus);
      toast.success(`${selected.length} member user${selected.length === 1 ? "" : "s"} updated.`);
      await loadUsers();
    } catch (err) {
      toast.error(readErrorMessage(err) || "Unable to bulk update member users.");
    }
  }

  return (
    <section className="users-page flex min-h-0 flex-1 flex-col gap-5">
      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-4">
        <AdminMetricCard label="Member Users" value={summary.total} note="Accounts in the system" />
        <AdminMetricCard
          label="Active"
          value={summary.active}
          note="Currently enabled"
          tone="success"
        />
        <AdminMetricCard label="Pending setup" value={summary.pending} note="Awaiting first sign-in" />
        <AdminMetricCard
          label="Disabled"
          value={summary.disabled}
          note="Requires reactivation"
          tone="warning"
        />
      </div>

      <AdminSectionPanel
        title="Member accounts"
        description="Only member login accounts are listed here."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 sm:w-72">
              <Search size={16} className="text-muted-foreground" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member users"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="users-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
            </Button>
            <div
              id="users-mobile-filters"
              className={[
                "flex flex-wrap items-center gap-2",
                mobileFiltersOpen ? "" : "hidden md:flex",
              ].join(" ")}
            >
              <Select
                value={status || "all"}
                onValueChange={(value) => setStatus(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING_SETUP">Pending setup</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-muted-foreground">{selectedCount} selected</p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedCount}
              onClick={() => void updateSelected("DISABLED")}
            >
              Disable
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedCount}
              onClick={() => void updateSelected("ACTIVE")}
            >
              Reactivate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedCount}
              onClick={() => void updateSelected("PENDING_SETUP")}
            >
              Mark pending
            </Button>
          </div>
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 text-xs uppercase tracking-[0.04em] text-muted-foreground">
              <tr>
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={() => toggleAll()}
                    aria-label="Select all visible"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Hibret</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                    Loading member users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm font-medium text-muted-foreground">
                    No member users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                        aria-label={`Select ${memberName(user)}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <UserCheck size={17} aria-hidden />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{memberName(user)}</p>
                          <p className="text-xs font-normal text-muted-foreground">
                            {user.memberId ? "Member profile linked" : "No member profile"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{user.hibretName || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusToBadgeVariant(user.status)}>{user.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {user.status === "DISABLED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void updateOne(user.id, "ACTIVE")}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void updateOne(user.id, "DISABLED")}
                          >
                            Disable
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void updateOne(user.id, "PENDING_SETUP")}
                        >
                          Pending
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:hidden">
          {loading ? (
            <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm font-medium text-muted-foreground">
              Loading member users...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm font-medium text-muted-foreground">
              No member users found.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedUsers.map((user) => (
                <article
                  key={user.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked={selected.includes(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                        aria-label={`Select ${memberName(user)}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{memberName(user)}</p>
                        <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={statusToBadgeVariant(user.status)}>{user.status}</Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-normal text-muted-foreground">
                    <p>Hibret: {user.hibretName || "-"}</p>
                    <p className="text-right">Last login: {formatDate(user.lastLoginAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {user.status === "DISABLED" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void updateOne(user.id, "ACTIVE")}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void updateOne(user.id, "DISABLED")}
                      >
                        Disable
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void updateOne(user.id, "PENDING_SETUP")}
                    >
                      Pending
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Page {safePage} of {totalPages} · {users.length} total
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
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
            </Button>
          </div>
        </div>
      </AdminSectionPanel>
    </section>
  );
}
