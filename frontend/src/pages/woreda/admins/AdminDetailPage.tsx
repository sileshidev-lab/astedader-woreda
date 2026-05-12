import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getAdmin, resendAdminSetup, updateAdminStatus } from "../../../services/adminService";
import type { AdminListItem } from "../../../services/adminService";
import { useAuthStore } from "../../../stores/authStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { statusToBadgeVariant } from "@/lib/badge";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

type AdminDetail = AdminListItem & {
  activity: Array<{
    id: string;
    operation: string;
    targetType?: string | null;
    targetName?: string | null;
    description?: string | null;
    createdAt: string;
  }>;
};

export function AdminDetailPage() {
  const { t } = useTranslation();
  const { adminId } = useParams();
  const { hasPrivilege } = useAuthStore();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canUpdate = hasPrivilege("admin.update");

  async function loadAdmin() {
    if (!adminId) return;

    try {
      const data = await getAdmin(adminId);
      setAdmin(data);
    } catch {
      toast.error(t("admins.detail.errors.load"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmin();
  }, [adminId]);

  async function changeStatus(status: "ACTIVE" | "DISABLED" | "PENDING_SETUP") {
    if (!admin) return;

    setBusy(true);

    try {
      const result = await updateAdminStatus(admin.id, status);
      toast.success(result.message);
      await loadAdmin();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("admins.errors.status"));
    } finally {
      setBusy(false);
    }
  }

  async function resendSetup() {
    if (!admin) return;

    setBusy(true);

    try {
      const result = await resendAdminSetup(admin.id);
      toast.success(result.message);
      await loadAdmin();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("admins.errors.resendSetup"));
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{t("admins.detail.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!admin) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{t("admins.detail.notFound")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {t("admins.detail.eyebrow")}
            </p>
            <CardTitle>{admin.email}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusToBadgeVariant(admin.status)}>{admin.status}</Badge>
              <Badge variant="muted">
                {admin.role === "WOREDA_ADMIN" ? t("admins.roles.woreda") : t("admins.roles.hibret")}
              </Badge>
            </div>
          </div>

          <Button asChild variant="outline" size="default">
            <Link to="/woreda/admins">
              <ArrowLeft aria-hidden />
              {t("admins.detail.back")}
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
          <Info label={t("admins.detail.fields.email")} value={admin.email} />
          <Info
            label={t("admins.detail.fields.scope")}
            value={
              admin.role === "WOREDA_ADMIN" ? t("admins.scope.woreda") : admin.hibretName || "-"
            }
          />
          <Info label={t("admins.detail.fields.lastLogin")} value={formatDate(admin.lastLoginAt)} />
          <Info label={t("admins.detail.fields.created")} value={formatDate(admin.createdAt)} />
        </CardContent>

        {canUpdate ? (
          <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
            {admin.status === "DISABLED" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => changeStatus("ACTIVE")}
              >
                {t("admins.actions.reactivate")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => changeStatus("DISABLED")}
              >
                {t("admins.actions.disable")}
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => changeStatus("PENDING_SETUP")}
            >
              {t("admins.detail.actions.markPendingSetup")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={resendSetup}
            >
              <Mail aria-hidden />
              {t("admins.actions.setupLink")}
            </Button>
          </div>
        ) : null}
      </Card>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <ShieldCheck size={18} aria-hidden />
              </div>
              <div>
                <CardTitle>{t("admins.form.privilegesTitle")}</CardTitle>
                <CardDescription>
                  {admin.privileges.includes("*")
                    ? t("admins.detail.privileges.fullSystemAccess")
                    : t("admins.privileges.count", { count: admin.privileges.length })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-2">
              {admin.privileges.map((privilege) => (
                <Badge key={privilege} variant="muted">
                  {privilege === "*" ? t("admins.privileges.fullAccess") : privilege}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>{t("admins.detail.activity.title")}</CardTitle>
            <CardDescription>{t("admins.detail.activity.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-auto p-0">
            {admin.activity.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                {t("admins.detail.activity.empty")}
              </div>
            ) : (
              admin.activity.map((item) => (
                <article key={item.id} className="border-b border-border px-5 py-4">
                  <p className="font-medium text-foreground">{item.operation}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description || item.targetName || item.targetType || "-"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
