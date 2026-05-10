import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { getAdmin, resendAdminSetup, updateAdminStatus } from "../../../services/adminService";
import type { AdminListItem } from "../../../services/adminService";

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
  const { adminId } = useParams();
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAdmin() {
    if (!adminId) return;

    setError("");

    try {
      const data = await getAdmin(adminId);
      setAdmin(data);
    } catch {
      setError("Unable to load admin.");
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
    setError("");
    setMessage("");

    try {
      const result = await updateAdminStatus(admin.id, status);
      setMessage(result.message);
      await loadAdmin();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to update admin status.");
    } finally {
      setBusy(false);
    }
  }

  async function resendSetup() {
    if (!admin) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await resendAdminSetup(admin.id);
      setMessage(result.message);
      await loadAdmin();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to resend setup email.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <section className="aw-design-page rounded border border-woreda-border bg-woreda-surface p-5 shadow-none">
        <p className="text-sm font-semibold text-woreda-textMuted">Loading admin.</p>
      </section>
    );
  }

  if (!admin) {
    return (
      <section className="aw-design-page rounded-3xl border border-woreda-border bg-woreda-surface p-5 shadow-sm">
        <p className="text-sm font-semibold text-woreda-textMuted">Admin not found.</p>
      </section>
    );
  }

  return (
    <section className="aw-design-page flex min-h-0 flex-1 flex-col gap-5">
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

      <div className="overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-none">
        <div className="flex flex-col gap-4 border-b border-woreda-border/60 bg-woreda-surfaceLow px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
              Admin detail
            </p>
            <h1 className="mt-2 text-2xl font-bold text-woreda-text">{admin.email}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={statusClass(admin.status)}>{admin.status}</span>
              <span className="rounded border border-woreda-border bg-woreda-surface px-2.5 py-1 text-xs font-bold text-woreda-textMuted">
                {admin.role === "WOREDA_ADMIN" ? "Woreda Admin" : "Hibret Admin"}
              </span>
            </div>
          </div>

          <Link
            to="/woreda/admins"
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
          >
            <ArrowLeft size={16} />
            Back to Admins
          </Link>
        </div>

        <div className="form-grid p-5">
          <Info label="Email" value={admin.email} />
          <Info label="Scope" value={admin.role === "WOREDA_ADMIN" ? "Woreda" : admin.hibretName || "-"} />
          <Info label="Last login" value={formatDate(admin.lastLoginAt)} />
          <Info label="Created" value={formatDate(admin.createdAt)} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-woreda-border/60 px-5 py-4">
          {admin.status === "DISABLED" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => changeStatus("ACTIVE")}
              className="rounded-2xl border border-woreda-success bg-woreda-successBg px-4 py-2 text-xs font-bold text-woreda-success"
            >
              Reactivate Account
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => changeStatus("DISABLED")}
              className="rounded-2xl border border-woreda-danger bg-woreda-dangerBg px-4 py-2 text-xs font-bold text-woreda-danger"
            >
              Disable Account
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => changeStatus("PENDING_SETUP")}
            className="rounded-2xl border border-woreda-border bg-woreda-surface px-4 py-2 text-xs font-bold text-woreda-text"
          >
            Mark Pending Setup
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={resendSetup}
            className="inline-flex items-center gap-2 rounded-2xl border border-woreda-primary bg-woreda-primarySoft px-4 py-2 text-xs font-bold text-woreda-primary hover:bg-woreda-primary hover:text-white"
          >
            <Mail size={14} />
            Resend Setup Link
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-3xl border border-woreda-border/70 bg-woreda-surface p-5 shadow-none">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-woreda-primary/20 bg-woreda-primarySoft text-woreda-primary">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-bold text-woreda-text">Privileges</h2>
              <p className="text-xs font-semibold text-woreda-textMuted">
                {admin.privileges.includes("*") ? "Full system access" : `${admin.privileges.length} privileges`}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {admin.privileges.map((privilege) => (
              <span
                key={privilege}
                className="rounded border border-woreda-border bg-woreda-surfaceLow px-2.5 py-1 text-xs font-bold text-woreda-textMuted"
              >
                {privilege === "*" ? "Full access" : privilege}
              </span>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-woreda-border/70 bg-woreda-surface shadow-none">
          <div className="shrink-0 border-b border-woreda-border/60 bg-woreda-surfaceLow px-5 py-4">
            <h2 className="font-bold text-woreda-text">Recent activity</h2>
            <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
              Latest activity recorded for this admin.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {admin.activity.length === 0 ? (
              <div className="p-5 text-sm font-semibold text-woreda-textMuted">
                No activity recorded yet.
              </div>
            ) : (
              admin.activity.map((item) => (
                <article
                  key={item.id}
                  className="border-b border-woreda-borderLight/40 px-5 py-4"
                >
                  <p className="font-bold text-woreda-text">{item.operation}</p>
                  <p className="mt-1 text-sm text-woreda-textMuted">
                    {item.description || item.targetName || item.targetType || "-"}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-woreda-textMuted">
                    {formatDate(item.createdAt)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-woreda-border/60 bg-woreda-surfaceLow p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-woreda-textMuted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-woreda-text">{value}</p>
    </div>
  );
}
