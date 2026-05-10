import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, UserCheck } from "lucide-react";
import {
  bulkUpdateManagedUsers,
  getManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
} from "../../../services/userService";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function memberName(user: ManagedUser) {
  return user.memberName || "Member account";
}

function statusClass(status: string) {
  if (status === "ACTIVE") {
    return "border-woreda-success/20 bg-woreda-successBg text-woreda-success";
  }
  if (status === "PENDING_SETUP") {
    return "border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary";
  }
  if (status === "DISABLED") {
    return "border-woreda-danger/20 bg-woreda-dangerBg text-woreda-danger";
  }
  return "border-woreda-border bg-woreda-surfaceLow text-woreda-textMuted";
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
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");

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
      setError("Unable to load member users.");
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
    setSelected(allVisibleSelected ? selected.filter((id) => !paginatedUsers.some((user) => user.id === id)) : [...new Set([...selected, ...paginatedUsers.map((user) => user.id)])]);
  }

  async function updateOne(userId: string, nextStatus: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    await updateManagedUserStatus(userId, nextStatus);
    await loadUsers();
  }

  async function updateSelected(nextStatus: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    if (!selected.length) return;
    await bulkUpdateManagedUsers(selected, nextStatus);
    await loadUsers();
  }

  return (
    <section className="aw-design-page users-page aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-5">
      {error ? <div className="aw-error-banner">{error}</div> : null}

      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-4">
        <Metric label="Member Users" value={summary.total} />
        <Metric label="Active" value={summary.active} />
        <Metric label="Pending setup" value={summary.pending} />
        <Metric label="Disabled" value={summary.disabled} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-woreda-border bg-woreda-surface">
        <div className="flex shrink-0 flex-col gap-3 border-b border-woreda-border bg-woreda-surfaceLow p-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black text-woreda-text">Member accounts</h2>
            <p className="mt-1 text-sm font-semibold text-woreda-textMuted">
              Only member login accounts are listed here.
            </p>
          </div>

          <div className="aw-toolbar aw-toolbar-mobile-controls flex flex-wrap items-center gap-2">
            <div className="flex min-h-10 w-full sm:max-w-[18rem] items-center gap-2 border border-woreda-border bg-woreda-surface px-3">
              <Search size={16} className="text-woreda-textMuted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member users"
                className="min-h-9 flex-1 border-0 bg-transparent outline-none"
              />
            </div>
            <button
              type="button"
              className="aw-btn aw-btn-outline aw-mobile-filters-toggle md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="users-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div
              id="users-mobile-filters"
              className={[
                "aw-toolbar-filter-group",
                mobileFiltersOpen ? "aw-toolbar-filter-group-open" : "",
              ].join(" ")}
            >
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="min-h-10 border border-woreda-border bg-woreda-surface px-3 text-sm font-bold"
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_SETUP">Pending setup</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-b border-woreda-border bg-woreda-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-woreda-textMuted">{selectedCount} selected</p>

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!selectedCount} onClick={() => updateSelected("DISABLED")} className="member-page-button">
              Disable
            </button>
            <button type="button" disabled={!selectedCount} onClick={() => updateSelected("ACTIVE")} className="member-page-button">
              Reactivate
            </button>
            <button type="button" disabled={!selectedCount} onClick={() => updateSelected("PENDING_SETUP")} className="member-page-button">
              Mark Pending
            </button>
          </div>
        </div>

        <div className="aw-fluid-table-scroll min-h-0 flex-1 hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-woreda-surfaceContainer">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
                </th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Hibret</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-bold text-woreda-textMuted">
                    Loading member users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center font-bold text-woreda-textMuted">
                    No member users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-woreda-primary bg-woreda-primarySoft text-woreda-primary">
                          <UserCheck size={17} />
                        </div>
                        <div>
                          <p className="font-black text-woreda-text">{memberName(user)}</p>
                          <p className="text-xs font-bold text-woreda-textMuted">{user.memberId ? "Member profile linked" : "No member profile"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold">{user.email}</td>
                    <td className="px-4 py-3">{user.hibretName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex border px-2 py-1 text-xs font-black ${statusClass(user.status)}`}>{user.status}</span>
                    </td>
                    <td className="px-4 py-3">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {user.status === "DISABLED" ? (
                          <button type="button" onClick={() => updateOne(user.id, "ACTIVE")} className="member-page-button">
                            Reactivate
                          </button>
                        ) : (
                          <button type="button" onClick={() => updateOne(user.id, "DISABLED")} className="member-page-button">
                            Disable
                          </button>
                        )}
                        <button type="button" onClick={() => updateOne(user.id, "PENDING_SETUP")} className="member-page-button">
                          Pending
                        </button>
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
            <div className="rounded border border-woreda-border bg-woreda-surfaceLow px-4 py-6 text-center text-sm font-bold text-woreda-textMuted">
              Loading member users...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded border border-woreda-border bg-woreda-surfaceLow px-4 py-6 text-center text-sm font-bold text-woreda-textMuted">
              No member users found.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedUsers.map((user) => (
                <article key={user.id} className="rounded-2xl border border-woreda-border bg-woreda-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggleUser(user.id)} />
                      <div className="min-w-0">
                        <p className="truncate font-black text-woreda-text">{memberName(user)}</p>
                        <p className="truncate text-xs font-semibold text-woreda-textMuted">{user.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex border px-2 py-1 text-[11px] font-black ${statusClass(user.status)}`}>{user.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold text-woreda-textMuted">
                    <p>Hibret: {user.hibretName || "-"}</p>
                    <p className="text-right">Last login: {formatDate(user.lastLoginAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {user.status === "DISABLED" ? (
                      <button type="button" onClick={() => updateOne(user.id, "ACTIVE")} className="member-page-button">
                        Reactivate
                      </button>
                    ) : (
                      <button type="button" onClick={() => updateOne(user.id, "DISABLED")} className="member-page-button">
                        Disable
                      </button>
                    )}
                    <button type="button" onClick={() => updateOne(user.id, "PENDING_SETUP")} className="member-page-button">
                      Pending
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-woreda-border bg-woreda-surfaceLow px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-woreda-textMuted">
            Page {safePage} of {totalPages} · {users.length} total
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <select
              className="member-page-size-select"
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
            <button type="button" className="member-page-button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button type="button" className="member-page-button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-full bg-[var(--aw-primary-soft)]" aria-hidden />
      <p className="relative text-[11px] font-black uppercase tracking-[0.14em] text-[var(--aw-muted)]">{label}</p>
      <p className="relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none text-[var(--aw-primary)]">
        {value}
      </p>
      <div className="relative mt-3 h-1.5 rounded-full bg-[var(--aw-primary)]" />
    </article>
  );
}
