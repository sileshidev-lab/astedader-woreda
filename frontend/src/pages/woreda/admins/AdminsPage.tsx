import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Edit3, Plus, Search } from "lucide-react";
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
import { useAuthStore } from "../../../stores/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/shadcn/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";
import { statusToBadgeVariant } from "@/lib/badge";
import { readErrorMessage } from "@/lib/errors";

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

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function Metric({ label, value }: { label: string; value: number }) {
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

export function AdminsPage() {
  const { t } = useTranslation();
  const { hasPrivilege } = useAuthStore();
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const canCreate = hasPrivilege("admin.create");
  const canUpdate = hasPrivilege("admin.update");

  const loadAdmins = useCallback(async () => {
    try {
      const [adminData, optionData] = await Promise.all([
        getAdmins(),
        getAdminFormOptions(),
      ]);

      setAdmins(adminData.admins);
      setSummary(adminData.summary);
      setOptions(optionData);
    } catch {
      toast.error(t("admins.errors.load"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdmins();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return admins.filter((admin) => {
      if (roleFilter && admin.role !== roleFilter) return false;
      if (statusFilter && admin.status !== statusFilter) return false;
      if (scopeFilter === "woreda" && admin.role !== "WOREDA_ADMIN")
        return false;
      if (scopeFilter === "hibret" && admin.role !== "HIBRET_ADMIN")
        return false;

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

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedAdmins = filteredAdmins.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

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

    try {
      const result = editingAdmin
        ? await updateAdmin(editingAdmin.id, payload)
        : await createAdmin(payload);

      toast.success(result.message);
      setIsFormOpen(false);
      setEditingAdmin(null);
      await loadAdmins();
    } catch (err) {
      toast.error(readErrorMessage(err) || t("admins.errors.save"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(
    admin: AdminListItem,
    status: "ACTIVE" | "DISABLED" | "PENDING_SETUP",
  ) {
    setBusyAdminId(admin.id);

    try {
      const result = await updateAdminStatus(admin.id, status);
      toast.success(result.message);
      await loadAdmins();
    } catch (err) {
      toast.error(readErrorMessage(err) || t("admins.errors.status"));
    } finally {
      setBusyAdminId(null);
    }
  }

  async function handleResendSetup(admin: AdminListItem) {
    setBusyAdminId(admin.id);

    try {
      const result = await resendAdminSetup(admin.id);
      toast.success(result.message);
      await loadAdmins();
    } catch (err) {
      toast.error(readErrorMessage(err) || t("admins.errors.resendSetup"));
    } finally {
      setBusyAdminId(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="hidden shrink-0 grid-cols-2 gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
        <Metric label={t("admins.kpi.total")} value={summary.total} />
        <Metric label={t("admins.kpi.woreda")} value={summary.woredaAdmins} />
        <Metric label={t("admins.kpi.hibret")} value={summary.hibretAdmins} />
        <Metric label={t("admins.kpi.active")} value={summary.active} />
        <Metric
          label={t("admins.kpi.pendingSetup")}
          value={summary.pendingSetup}
        />
        <Metric label={t("admins.kpi.disabled")} value={summary.disabled} />
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <CardDescription>
              {t("admins.summaryLine", {
                filtered: filteredAdmins.length,
                total: admins.length,
              })}
            </CardDescription>

            {canCreate ? (
              <Button
                type="button"
                variant="default"
                size="default"
                onClick={openCreate}
              >
                <Plus aria-hidden />
                {t("admins.actions.create")}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <div className="relative md:min-w-[280px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setPage(1);
                }}
                placeholder={t("admins.filters.searchPlaceholder")}
                className="pl-9"
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
              {t("common.filters")}
              {mobileFiltersOpen ? (
                <ChevronUp aria-hidden />
              ) : (
                <ChevronDown aria-hidden />
              )}
            </Button>
            <div
              className={[
                "flex-col gap-2 md:flex md:flex-row md:flex-wrap md:items-center",
                mobileFiltersOpen ? "flex" : "hidden",
              ].join(" ")}
            >
              <Select
                value={roleFilter || "all"}
                onValueChange={(value) => {
                  setRoleFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="min-w-[160px] md:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admins.filters.roleAll")}
                  </SelectItem>
                  <SelectItem value="WOREDA_ADMIN">
                    {t("admins.roles.woreda")}
                  </SelectItem>
                  <SelectItem value="HIBRET_ADMIN">
                    {t("admins.roles.hibret")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => {
                  setStatusFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="min-w-[160px] md:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admins.filters.statusAll")}
                  </SelectItem>
                  <SelectItem value="ACTIVE">
                    {t("admins.status.active")}
                  </SelectItem>
                  <SelectItem value="PENDING_SETUP">
                    {t("admins.status.pendingSetup")}
                  </SelectItem>
                  <SelectItem value="DISABLED">
                    {t("admins.status.disabled")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={scopeFilter || "all"}
                onValueChange={(value) => {
                  setScopeFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="min-w-[160px] md:w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admins.filters.scopeAll")}
                  </SelectItem>
                  <SelectItem value="woreda">
                    {t("admins.filters.scopeWoreda")}
                  </SelectItem>
                  <SelectItem value="hibret">
                    {t("admins.filters.scopeHibret")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={() => {
                  setSearchText("");
                  setRoleFilter("");
                  setStatusFilter("");
                  setScopeFilter("");
                  setPage(1);
                }}
              >
                {t("common.clear")}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 px-0 pb-0 pt-0">
          <div className="hidden min-h-0 md:block">
            {isLoading ? (
              <div className="p-5 text-sm text-muted-foreground">
                {t("admins.loading")}
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-5">
                <EmptyMessage message={t("admins.empty")} />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admins.table.admin")}</TableHead>
                    <TableHead>{t("admins.table.scope")}</TableHead>
                    <TableHead>{t("admins.table.account")}</TableHead>
                    <TableHead>{t("admins.table.privileges")}</TableHead>
                    <TableHead>{t("admins.table.lastLogin")}</TableHead>
                    <TableHead className="text-right">
                      {t("admins.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                            {initials(admin.email)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {admin.email}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {admin.role === "WOREDA_ADMIN"
                                ? t("admins.roles.woredaLabel")
                                : t("admins.roles.hibretLabel")}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <p className="font-medium text-foreground">
                          {admin.role === "WOREDA_ADMIN"
                            ? t("admins.scope.woreda")
                            : admin.hibretName || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {admin.role === "WOREDA_ADMIN"
                            ? t("admins.scope.allSystem")
                            : t("admins.scope.assignedHibret")}
                        </p>
                      </TableCell>

                      <TableCell>
                        <Badge variant={statusToBadgeVariant(admin.status)}>
                          {admin.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {admin.privileges.includes("*") ? (
                          <Badge variant="default">
                            {t("admins.privileges.fullAccess")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("admins.privileges.count", {
                              count: admin.privileges.length,
                            })}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(admin.lastLoginAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/woreda/admins/${admin.id}`}>
                              {t("common.open")}
                            </Link>
                          </Button>

                          {canUpdate ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(admin)}
                            >
                              <Edit3 aria-hidden />
                              {t("common.edit")}
                            </Button>
                          ) : null}

                          {canUpdate ? (
                            admin.status === "DISABLED" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busyAdminId === admin.id}
                                onClick={() => handleStatus(admin, "ACTIVE")}
                              >
                                {t("admins.actions.reactivate")}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busyAdminId === admin.id}
                                onClick={() => handleStatus(admin, "DISABLED")}
                              >
                                {t("admins.actions.disable")}
                              </Button>
                            )
                          ) : null}

                          {canUpdate ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busyAdminId === admin.id}
                              onClick={() => handleResendSetup(admin)}
                            >
                              {t("admins.actions.setupLink")}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 md:hidden">
            {isLoading ? (
              <EmptyMessage message={t("admins.loading")} />
            ) : filteredAdmins.length === 0 ? (
              <EmptyMessage message={t("admins.empty")} />
            ) : (
              <div className="space-y-3">
                {paginatedAdmins.map((admin) => (
                  <Card key={admin.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {admin.email}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {admin.role === "WOREDA_ADMIN"
                              ? t("admins.roles.woredaLabel")
                              : t("admins.roles.hibretLabel")}
                          </p>
                        </div>
                        <Badge variant={statusToBadgeVariant(admin.status)}>
                          {admin.status}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {t("admins.mobile.scopeLabel")}{" "}
                        {admin.role === "WOREDA_ADMIN"
                          ? t("admins.scope.woreda")
                          : admin.hibretName || "-"}
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/woreda/admins/${admin.id}`}>
                            {t("common.open")}
                          </Link>
                        </Button>
                        {canUpdate ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(admin)}
                          >
                            <Edit3 aria-hidden />
                            {t("common.edit")}
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-5 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {t("common.paginationLine", {
              page: safePage,
              pages: totalPages,
              total: filteredAdmins.length,
            })}
          </span>
          <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-auto px-2 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">
                  {t("common.pageSize", { size: 10 })}
                </SelectItem>
                <SelectItem value="20">
                  {t("common.pageSize", { size: 20 })}
                </SelectItem>
                <SelectItem value="50">
                  {t("common.pageSize", { size: 50 })}
                </SelectItem>
                <SelectItem value="100">
                  {t("common.pageSize", { size: 100 })}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("common.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>

      <AdminFormModal
        key={isFormOpen ? (editingAdmin?.id ?? "new") : "closed"}
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
  const { t } = useTranslation();
  const initialRole = (admin?.role as AdminRole) || "HIBRET_ADMIN";
  const [email, setEmail] = useState(() => admin?.email || "");
  const [role, setRole] = useState<AdminRole>(initialRole);
  const [hibretId, setHibretId] = useState(() =>
    initialRole === "WOREDA_ADMIN" ? "" : admin?.hibretId || "",
  );
  const [privileges, setPrivileges] = useState<string[]>(() => {
    const seed = admin?.privileges?.length ? admin.privileges : [];
    if (initialRole === "WOREDA_ADMIN") {
      return seed.length === 0 ? ["*"] : seed;
    }
    return seed;
  });

  function handleRoleChange(nextRole: AdminRole) {
    setRole(nextRole);

    if (nextRole === "WOREDA_ADMIN") {
      setHibretId("");
      setPrivileges((current) => (current.length === 0 ? ["*"] : current));
    }
  }

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
      toast.error(t("admins.form.errors.emailRequired"));
      return;
    }

    if (role === "HIBRET_ADMIN" && !hibretId) {
      toast.error(t("admins.form.errors.hibretRequired"));
      return;
    }

    if (privileges.length === 0) {
      toast.error(t("admins.form.errors.privilegeRequired"));
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
    <Sheet open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader className="border-b border-border bg-muted/30">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("admins.form.eyebrow")}
            </p>
            <SheetTitle>
              {admin
                ? t("admins.form.editTitle")
                : t("admins.form.createTitle")}
            </SheetTitle>
            <SheetDescription>
              {admin
                ? t("admins.form.editTitle")
                : t("admins.form.createTitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email">{t("admins.form.email")}</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-role">{t("admins.form.role")}</Label>
                <Select
                  value={role}
                  onValueChange={(value) =>
                    handleRoleChange(value as AdminRole)
                  }
                >
                  <SelectTrigger id="admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIBRET_ADMIN">
                      {t("admins.roles.hibret")}
                    </SelectItem>
                    <SelectItem value="WOREDA_ADMIN">
                      {t("admins.roles.woreda")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-hibret">{t("admins.form.hibret")}</Label>
                <Select
                  value={hibretId || "none"}
                  onValueChange={(value) =>
                    setHibretId(value === "none" ? "" : value)
                  }
                  disabled={role === "WOREDA_ADMIN"}
                >
                  <SelectTrigger id="admin-hibret">
                    <SelectValue placeholder={t("admins.form.selectHibret")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("admins.form.selectHibret")}
                    </SelectItem>
                    {options.hibrets.map((hibret) => (
                      <SelectItem key={hibret.id} value={hibret.id}>
                        {hibret.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {t("admins.form.privilegesTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("admins.form.privilegesHint")}
                  </p>
                </div>

                <Badge variant="muted">
                  {privileges.includes("*")
                    ? t("admins.privileges.fullAccess")
                    : t("admins.form.selectedCount", {
                        count: privileges.length,
                      })}
                </Badge>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {options.privileges.map((privilege) => (
                  <label
                    key={privilege}
                    className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    <Checkbox
                      checked={privileges.includes(privilege)}
                      onCheckedChange={() => togglePrivilege(privilege)}
                    />
                    <span>
                      {privilege === "*"
                        ? t("admins.form.fullAccessLabel")
                        : privilege}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onClose}
            >
              {t("common.cancel")}
            </Button>

            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={isSaving}
            >
              {isSaving ? t("common.saving") : t("admins.actions.save")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
