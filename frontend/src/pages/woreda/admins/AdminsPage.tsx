import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Edit3,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  createAdmin,
  getAdminFormOptions,
  getAdmins,
  resendAdminSetup,
  updateAdmin,
  updateAdminStatus,
} from "../../../services/adminService";
import type {
  AdminFormOptions,
  AdminListItem,
  AdminPayload,
  AdminRole,
  AdminSummary,
} from "../../../services/adminService";

const emptySummary: AdminSummary = {
  total: 0,
  woredaAdmins: 0,
  hibretAdmins: 0,
  active: 0,
  pendingSetup: 0,
  disabled: 0,
};

const emptyOptions: AdminFormOptions = {
  hibrets: [],
  privileges: [],
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusClass(status?: string | null) {
  if (status === "ACTIVE") {
    return "rounded border border-woreda-success/20 bg-woreda-successBg px-2.5 py-1 text-xs font-bold text-woreda-success";
  }

  if (status === "PENDING_SETUP") {
    return "rounded border border-woreda-primary/20 bg-woreda-primarySoft px-2.5 py-1 text-xs font-bold text-woreda-primary";
  }

  if (status === "DISABLED") {
    return "rounded border border-woreda-danger/20 bg-woreda-dangerBg px-2.5 py-1 text-xs font-bold text-woreda-danger";
  }

  return "rounded border border-woreda-border bg-woreda-surfaceLow px-2.5 py-1 text-xs font-bold text-woreda-textMuted";
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [summary, setSummary] = useState<AdminSummary>(emptySummary);
  const [options, setOptions] = useState<AdminFormOptions>(emptyOptions);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  async function loadAdmins() {
    setError("");

    try {
      const [adminData, optionData] = await Promise.all([
        getAdmins(),
        getAdminFormOptions(),
      ]);

      setAdmins(adminData.admins);
      setSummary(adminData.summary);
      setOptions(optionData);
    } catch {
      setError("Unable to load admins.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return admins.filter((admin) => {
      if (roleFilter && admin.role !== roleFilter) return false;
      if (statusFilter && admin.status !== statusFilter) return false;
      if (scopeFilter === "woreda" && admin.role !== "WOREDA_ADMIN") return false;
      if (scopeFilter === "hibret" && admin.role !== "HIBRET_ADMIN") return false;

      if (!query) return true;

      return [
        admin.email,
        admin.role,
        admin.status,
        admin.hibretName,
        admin.privileges.join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [admins, roleFilter, searchText, scopeFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchText, roleFilter, statusFilter, scopeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAdmins = filteredAdmins.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openCreate() {
    setEditingAdmin(null);
    setIsFormOpen(true);
  }

  function openEdit(admin: AdminListItem) {
    setEditingAdmin(admin);
    setIsFormOpen(true);
  }

  async function handleSave(payload: AdminPayload) {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const result = editingAdmin
        ? await updateAdmin(editingAdmin.id, payload)
        : await createAdmin(payload);

      setMessage(result.message);
      setIsFormOpen(false);
      setEditingAdmin(null);
      await loadAdmins();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save admin.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(admin: AdminListItem, status: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    setBusyAdminId(admin.id);
    setError("");
    setMessage("");

    try {
      const result = await updateAdminStatus(admin.id, status);
      setMessage(result.message);
      await loadAdmins();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to update admin status.");
    } finally {
      setBusyAdminId(null);
    }
  }

  async function handleResendSetup(admin: AdminListItem) {
    setBusyAdminId(admin.id);
    setError("");
    setMessage("");

    try {
      const result = await resendAdminSetup(admin.id);
      setMessage(result.message);
      await loadAdmins();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to resend setup email.");
    } finally {
      setBusyAdminId(null);
    }
  }

  return (
    <section className="aw-design-page aw-mobile-page aw-mobile-filterable flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="rounded border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded border border-woreda-primary/20 bg-woreda-primarySoft px-4 py-3 text-sm font-semibold text-woreda-primary">
          {message}
        </div>
      ) : null}

      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Admins" value={summary.total} />
        <Metric label="Woreda" value={summary.woredaAdmins} tone="primary" />
        <Metric label="Hibret" value={summary.hibretAdmins} tone="primary" />
        <Metric label="Active" value={summary.active} tone="success" />
        <Metric label="Pending" value={summary.pendingSetup} tone="primary" />
        <Metric label="Disabled" value={summary.disabled} tone="danger" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="shrink-0 border-b border-woreda-border/60 bg-woreda-surfaceLow px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-sm font-semibold text-woreda-textMuted">
              {filteredAdmins.length} of {admins.length} admins
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar"
            >
              <Plus size={16} />
              Create Admin
            </button>
          </div>

          <div className="aw-toolbar aw-toolbar-mobile-controls mt-4">
            <div className="flex min-h-10 border border-woreda-border/70 bg-woreda-surface">
              <span className="flex items-center px-3 text-woreda-textMuted">
                <Search size={15} />
              </span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search email, role, Hibret, privilege"
                className="w-full bg-transparent px-2 py-2 text-sm outline-none"
              />
            </div>
            <button
              type="button"
              className="aw-btn aw-btn-outline aw-mobile-filters-toggle md:hidden"
              onClick={() => setMobileFiltersOpen((open) => !open)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="admins-mobile-filters"
            >
              Filters
              {mobileFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <div
              id="admins-mobile-filters"
              className={[
                "aw-toolbar-filter-group",
                mobileFiltersOpen ? "aw-toolbar-filter-group-open" : "",
              ].join(" ")}
            >

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="">All roles</option>
              <option value="WOREDA_ADMIN">Woreda Admin</option>
              <option value="HIBRET_ADMIN">Hibret Admin</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_SETUP">Pending setup</option>
              <option value="DISABLED">Disabled</option>
            </select>

            <select
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value)}
              className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            >
              <option value="">All scopes</option>
              <option value="woreda">Woreda scope</option>
              <option value="hibret">Hibret scope</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setRoleFilter("");
                setStatusFilter("");
                setScopeFilter("");
              }}
              className="min-h-10 rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              Clear
            </button>
            </div>
          </div>
        </div>

        <div className="aw-fluid-table-scroll aw-fluid-table-scroll--tight min-h-0 flex-1 hidden md:block">
          {isLoading ? (
            <div className="p-5 text-sm font-semibold text-woreda-textMuted">
              Loading admins.
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-5">
              <EmptyMessage message="No admins match the current filters." />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-woreda-surfaceLow text-[10px] uppercase tracking-[0.16em] text-woreda-textMuted">
                <tr>
                  <th className="border-b border-woreda-border/60 px-4 py-3">Admin</th>
                  <th className="border-b border-woreda-border/60 px-4 py-3">Scope</th>
                  <th className="border-b border-woreda-border/60 px-4 py-3">Account</th>
                  <th className="border-b border-woreda-border/60 px-4 py-3">Privileges</th>
                  <th className="border-b border-woreda-border/60 px-4 py-3">Last login</th>
                  <th className="border-b border-woreda-border/60 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedAdmins.map((admin) => (
                  <tr key={admin.id} className="transition hover:bg-woreda-primarySoft/40">
                    <td className="border-b border-woreda-borderLight/40 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-woreda-primary/20 bg-woreda-primarySoft text-xs font-black text-woreda-primary">
                          {initials(admin.email)}
                        </div>
                        <div>
                          <p className="font-bold text-woreda-text">{admin.email}</p>
                          <p className="mt-0.5 text-xs font-semibold text-woreda-textMuted">
                            {admin.role === "WOREDA_ADMIN" ? "Woreda admin" : "Hibret admin"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="border-b border-woreda-borderLight/40 px-4 py-4">
                      <p className="font-bold text-woreda-text">
                        {admin.role === "WOREDA_ADMIN" ? "Woreda" : admin.hibretName || "-"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                        {admin.role === "WOREDA_ADMIN" ? "All system scope" : "Assigned Hibret"}
                      </p>
                    </td>

                    <td className="border-b border-woreda-borderLight/40 px-4 py-4">
                      <span className={statusClass(admin.status)}>{admin.status}</span>
                    </td>

                    <td className="border-b border-woreda-borderLight/40 px-4 py-4">
                      {admin.privileges.includes("*") ? (
                        <span className="rounded border border-woreda-primary/20 bg-woreda-primarySoft px-2.5 py-1 text-xs font-bold text-woreda-primary">
                          Full access
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-woreda-textMuted">
                          {admin.privileges.length} privileges
                        </span>
                      )}
                    </td>

                    <td className="border-b border-woreda-borderLight/40 px-4 py-4 text-sm font-semibold text-woreda-textMuted">
                      {formatDate(admin.lastLoginAt)}
                    </td>

                    <td className="border-b border-woreda-borderLight/40 px-4 py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to={`/woreda/admins/${admin.id}`}
                          className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-border bg-woreda-surface px-3 py-1.5 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
                        >
                          View
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEdit(admin)}
                          className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-primary bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary hover:bg-woreda-primary hover:text-white"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>

                        {admin.status === "DISABLED" ? (
                          <button
                            type="button"
                            disabled={busyAdminId === admin.id}
                            onClick={() => handleStatus(admin, "ACTIVE")}
                            className="rounded border border-woreda-success bg-woreda-successBg px-3 py-1.5 text-xs font-bold text-woreda-success"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyAdminId === admin.id}
                            onClick={() => handleStatus(admin, "DISABLED")}
                            className="rounded border border-woreda-danger bg-woreda-dangerBg px-3 py-1.5 text-xs font-bold text-woreda-danger"
                          >
                            Disable
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={busyAdminId === admin.id}
                          onClick={() => handleResendSetup(admin)}
                          className="rounded border border-woreda-border bg-woreda-surface px-3 py-1.5 text-xs font-bold text-woreda-text"
                        >
                          Setup Link
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 md:hidden">
          {isLoading ? (
            <div className="rounded border border-woreda-border bg-woreda-surfaceLow px-4 py-6 text-center text-sm font-semibold text-woreda-textMuted">
              Loading admins.
            </div>
          ) : filteredAdmins.length === 0 ? (
            <EmptyMessage message="No admins match the current filters." />
          ) : (
            <div className="space-y-3">
              {paginatedAdmins.map((admin) => (
                <article key={admin.id} className="rounded border border-woreda-border bg-woreda-surface p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-woreda-text">{admin.email}</p>
                      <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                        {admin.role === "WOREDA_ADMIN" ? "Woreda admin" : "Hibret admin"}
                      </p>
                    </div>
                    <span className={statusClass(admin.status)}>{admin.status}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-woreda-textMuted">
                    Scope: {admin.role === "WOREDA_ADMIN" ? "Woreda" : admin.hibretName || "-"}
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Link
                      to={`/woreda/admins/${admin.id}`}
                      className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-border bg-woreda-surface px-3 py-1.5 text-xs font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => openEdit(admin)}
                      className="inline-flex min-h-9 items-center gap-2 rounded border border-woreda-primary bg-woreda-primarySoft px-3 py-1.5 text-xs font-bold text-woreda-primary"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-woreda-border bg-woreda-surfaceLow px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-woreda-textMuted">
            Page {safePage} of {totalPages} · {filteredAdmins.length} total
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <select
              className="aw-filter-select"
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
            <button
              type="button"
              className="aw-btn aw-btn-outline-strong"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="aw-btn aw-btn-outline-strong"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <AdminFormModal
        isOpen={isFormOpen}
        admin={editingAdmin}
        options={options}
        isSaving={isSaving}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAdmin(null);
        }}
        onSubmit={handleSave}
      />
    </section>
  );
}

function AdminFormModal({
  isOpen,
  admin,
  options,
  isSaving,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  admin: AdminListItem | null;
  options: AdminFormOptions;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: AdminPayload) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("HIBRET_ADMIN");
  const [hibretId, setHibretId] = useState("");
  const [privileges, setPrivileges] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setEmail(admin?.email || "");
    setRole((admin?.role as AdminRole) || "HIBRET_ADMIN");
    setHibretId(admin?.hibretId || "");
    setPrivileges(admin?.privileges?.length ? admin.privileges : []);
    setLocalError("");
  }, [admin, isOpen]);

  useEffect(() => {
    if (role === "WOREDA_ADMIN") {
      setHibretId("");
      if (privileges.length === 0) setPrivileges(["*"]);
    }
  }, [privileges.length, role]);

  if (!isOpen) return null;

  function togglePrivilege(privilege: string) {
    setPrivileges((current) => {
      if (privilege === "*") {
        return current.includes("*") ? [] : ["*"];
      }

      const withoutFullAccess = current.filter((item) => item !== "*");

      return withoutFullAccess.includes(privilege)
        ? withoutFullAccess.filter((item) => item !== privilege)
        : [...withoutFullAccess, privilege];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) {
      setLocalError("Email is required.");
      return;
    }

    if (role === "HIBRET_ADMIN" && !hibretId) {
      setLocalError("Hibret is required for Hibret admins.");
      return;
    }

    if (privileges.length === 0) {
      setLocalError("Select at least one privilege.");
      return;
    }

    await onSubmit({
      email: email.trim().toLowerCase(),
      role,
      hibretId: role === "HIBRET_ADMIN" ? hibretId : null,
      privileges,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[var(--overlay-scrim)]">
      <form
        onSubmit={handleSubmit}
        className="flex min-h-0 h-full w-full max-w-2xl flex-col bg-woreda-surface text-woreda-text shadow-none"
      >
        <div className="flex items-start justify-between border-b border-woreda-border bg-woreda-surfaceLow px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
              Admin account
            </p>
            <h2 className="mt-1 text-xl font-bold text-woreda-text">
              {admin ? "Edit Admin" : "Create Admin"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="border border-woreda-border bg-woreda-surface p-2 text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {localError ? (
            <div className="rounded border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
              {localError}
            </div>
          ) : null}

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-11 w-full rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
            />
          </label>

          <div className="form-grid">
            <label>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                Role
              </span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
                className="mt-2 min-h-11 w-full rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
              >
                <option value="HIBRET_ADMIN">Hibret Admin</option>
                <option value="WOREDA_ADMIN">Woreda Admin</option>
              </select>
            </label>

            <label>
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
                Hibret
              </span>
              <select
                disabled={role === "WOREDA_ADMIN"}
                value={hibretId}
                onChange={(event) => setHibretId(event.target.value)}
                className="mt-2 min-h-11 w-full rounded border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select Hibret</option>
                {options.hibrets.map((hibret) => (
                  <option key={hibret.id} value={hibret.id}>
                    {hibret.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-woreda-text">Privileges</h3>
                <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                  Select what this admin can access.
                </p>
              </div>

              <span className="rounded border border-woreda-border bg-woreda-surfaceLow px-2.5 py-1 text-xs font-bold text-woreda-textMuted">
                {privileges.includes("*") ? "Full access" : `${privileges.length} selected`}
              </span>
            </div>

            <div className="form-grid mt-4">
              {options.privileges.map((privilege) => (
                <label
                  key={privilege}
                  className="flex items-center gap-3 rounded border border-woreda-border bg-woreda-surfaceLow px-3 py-2 text-sm font-semibold text-woreda-text"
                >
                  <input
                    type="checkbox"
                    checked={privileges.includes(privilege)}
                    onChange={() => togglePrivilege(privilege)}
                    className="h-4 w-4"
                  />
                  <span>{privilege === "*" ? "Full access (*)" : privilege}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-woreda-border bg-woreda-surfaceLow px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded border border-woreda-border bg-woreda-surface px-5 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 rounded border border-woreda-primary bg-woreda-primary px-5 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Admin"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "success" | "danger";
}) {
  const toneClass =
    tone === "primary"
      ? {
          soft: "bg-[var(--aw-primary-soft)]",
          value: "text-[var(--aw-primary)]",
          bar: "bg-[var(--aw-primary)]",
        }
      : tone === "success"
        ? {
            soft: "bg-[var(--aw-success-bg)]",
            value: "text-[var(--aw-success)]",
            bar: "bg-[var(--aw-success)]",
          }
        : tone === "danger"
          ? {
              soft: "bg-[var(--aw-magenta-bg)]",
              value: "text-[var(--aw-magenta)]",
              bar: "bg-[var(--aw-magenta)]",
            }
          : {
              soft: "bg-[var(--aw-surface-muted)]",
              value: "text-[var(--aw-text)]",
              bar: "bg-[var(--aw-muted)]",
            };

  return (
    <article className="aw-stat-card relative overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm">
      <div className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${toneClass.soft}`} aria-hidden />
      <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">{label}</p>
      <p className={`relative mt-2 text-[clamp(1.35rem,2vw,2rem)] font-black leading-none ${toneClass.value}`}>
        {value}
      </p>
      <div className={`relative mt-3 h-1.5 rounded-full ${toneClass.bar}`} />
    </article>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded border border-dashed border-woreda-border bg-woreda-surfaceLow px-4 py-10 text-center text-sm font-semibold text-woreda-textMuted">
      {message}
    </div>
  );
}
