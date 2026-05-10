import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Save, Search, Users } from "lucide-react";
import {
  getHibretAnnouncement,
  getHibretAttendance,
  saveHibretAttendance,
} from "../../../services/hibretService";
import type {
  AttendanceStatus,
  HibretAttendance,
} from "../../../services/hibretService";
import type { Announcement } from "../../../types/announcement";
import {
  AdminEmptyState,
  AdminMetricCard,
  AdminSectionPanel,
} from "../../../components/ui/AdminPagePrimitives";

type AttendanceDraftRow = {
  memberId: string;
  status: AttendanceStatus | null;
  note: string;
};

function statusButtonClass(current: AttendanceStatus | null, status: AttendanceStatus) {
  if (current === status) {
    if (status === "present") {
      return "border-[var(--aw-success)] bg-[var(--aw-success)] text-white";
    }
    if (status === "absent") {
      return "border-[var(--aw-danger)] bg-[var(--aw-danger)] text-white";
    }
    return "border-[var(--aw-yellow)] bg-[var(--aw-yellow)] text-[var(--aw-primary-strong)]";
  }

  return "border-[var(--aw-border-soft)] bg-[var(--aw-surface)] text-[var(--aw-muted)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]";
}

export function HibretAttendancePage() {
  const { announcementId } = useParams();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [attendance, setAttendance] = useState<HibretAttendance | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, AttendanceDraftRow>>({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus | "unmarked">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    if (!announcementId) return;

    setIsLoading(true);
    setError("");

    try {
      const [directive, attendanceData] = await Promise.all([
        getHibretAnnouncement(announcementId),
        getHibretAttendance(announcementId),
      ]);

      setAnnouncement(directive);
      setAttendance(attendanceData);

      const nextRows: Record<string, AttendanceDraftRow> = {};
      attendanceData.members.forEach((member) => {
        nextRows[member.memberId] = {
          memberId: member.memberId,
          status: member.status,
          note: member.note || "",
        };
      });
      setAttendanceRows(nextRows);
    } catch {
      setError("Unable to load attendance.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [announcementId]);

  const summary = useMemo(() => {
    const rows = Object.values(attendanceRows);
    return {
      total: attendance?.members.length ?? 0,
      marked: rows.filter((row) => row.status).length,
      present: rows.filter((row) => row.status === "present").length,
      absent: rows.filter((row) => row.status === "absent").length,
      excused: rows.filter((row) => row.status === "excused").length,
    };
  }, [attendance?.members.length, attendanceRows]);

  const filteredMembers = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const members = attendance?.members ?? [];

    return members.filter((member) => {
      const row = attendanceRows[member.memberId];

      if (statusFilter === "unmarked" && row?.status) return false;
      if (statusFilter !== "all" && statusFilter !== "unmarked" && row?.status !== statusFilter) {
        return false;
      }

      if (!query) return true;

      return [member.name, member.memberCode, member.gender, member.phone, row?.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [attendance?.members, attendanceRows, searchText, statusFilter]);

  function setAttendanceStatus(memberId: string, status: AttendanceStatus) {
    setAttendanceRows((current) => ({
      ...current,
      [memberId]: {
        memberId,
        status,
        note: current[memberId]?.note || "",
      },
    }));
  }

  function setAttendanceNote(memberId: string, note: string) {
    setAttendanceRows((current) => ({
      ...current,
      [memberId]: {
        memberId,
        status: current[memberId]?.status ?? null,
        note,
      },
    }));
  }

  async function saveAttendance() {
    if (!announcementId || !attendance) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const records = Object.values(attendanceRows).filter(
        (row): row is AttendanceDraftRow & { status: AttendanceStatus } => Boolean(row.status)
      );

      const saved = await saveHibretAttendance(
        announcementId,
        records.map((row) => ({
          memberId: row.memberId,
          status: row.status,
          note: row.note || null,
        }))
      );

      setAttendance(saved);

      const nextRows: Record<string, AttendanceDraftRow> = {};
      saved.members.forEach((member) => {
        nextRows[member.memberId] = {
          memberId: member.memberId,
          status: member.status,
          note: member.note || "",
        };
      });
      setAttendanceRows(nextRows);
      setMessage("Attendance saved successfully.");
    } catch {
      setError("Unable to save attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-[260px] items-center rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-5 shadow-sm">
        <p className="text-sm font-semibold text-[var(--aw-muted)]">Loading attendance.</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      {error ? (
        <div className="rounded-2xl border border-[var(--aw-danger)] bg-[var(--aw-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--aw-danger)]">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-[var(--aw-success)] bg-[var(--aw-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--aw-success)]">
          {message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 sm:p-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link
              to={`/hibret/announcements/${announcementId}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-black text-[var(--aw-text)] shadow-sm hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              <ArrowLeft size={16} />
              Back to Directive
            </Link>

            <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--aw-muted)]">
              Attendance
            </p>
            <h1 className="mt-1 max-w-5xl text-[clamp(1.25rem,2vw,1.9rem)] font-black leading-tight text-[var(--aw-text)]">
              {announcement?.title || "Hibret member attendance"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-[var(--aw-muted)]">
              Mark member attendance for this directive before submitting the Hibret report.
            </p>
          </div>

          <button
            type="button"
            onClick={saveAttendance}
            disabled={isSaving}
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[var(--aw-primary)] px-4 text-sm font-black text-white shadow-sm hover:bg-[var(--aw-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Attendance"}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-[var(--aw-border-soft)] bg-[var(--aw-bg)] p-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard label="Members" value={summary.total} tone="default" />
          <AdminMetricCard label="Marked" value={summary.marked} tone="primary" />
          <AdminMetricCard label="Present" value={summary.present} tone="success" />
          <AdminMetricCard label="Absent" value={summary.absent} tone="warning" />
          <AdminMetricCard label="Excused" value={summary.excused} tone="default" />
        </div>
      </section>

      <AdminSectionPanel
        title="Attendance Register"
        description="Search, filter, and update each member with the same admin table structure used across directive pages."
        actions={
          <>
            <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-bg)] px-3 focus-within:border-[var(--aw-primary)] sm:min-w-[280px]">
              <Search size={18} className="shrink-0 text-[var(--aw-muted)]" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search member, code, phone, or note"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--aw-text)] outline-none placeholder:text-[var(--aw-muted)]"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="min-h-11 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 text-sm font-black text-[var(--aw-text)] outline-none focus:border-[var(--aw-primary)]"
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="unmarked">Unmarked</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setSearchText("");
                setStatusFilter("all");
              }}
              className="min-h-11 rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-4 text-sm font-black text-[var(--aw-text)] hover:border-[var(--aw-primary)] hover:text-[var(--aw-primary)]"
            >
              Clear
            </button>
          </>
        }
      >
        {!attendance || filteredMembers.length === 0 ? (
          <div className="p-5">
            <AdminEmptyState
              title="No members found"
              description="Try clearing your filters or check that this Hibret has members assigned."
            />
          </div>
        ) : (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {filteredMembers.map((member) => {
                const row = attendanceRows[member.memberId] ?? {
                  memberId: member.memberId,
                  status: member.status,
                  note: member.note || "",
                };

                return (
                  <article
                    key={member.memberId}
                    className="rounded-3xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-[var(--aw-text)]">{member.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                          {member.memberCode || "-"} · {member.gender || "-"} · {member.phone || "-"}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--aw-primary-soft)] text-[var(--aw-primary)]">
                        <Users size={18} />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["present", "absent", "excused"] as AttendanceStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAttendanceStatus(member.memberId, status)}
                          className={[
                            "rounded-full border px-3 py-1 text-xs font-black uppercase",
                            statusButtonClass(row.status, status),
                          ].join(" ")}
                        >
                          {status}
                        </button>
                      ))}
                    </div>

                    <label className="mt-4 block">
                      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                        Note
                      </span>
                      <input
                        value={row.note}
                        onChange={(event) => setAttendanceNote(member.memberId, event.target.value)}
                        placeholder="Optional note"
                        className="mt-2 min-h-11 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--aw-primary)]"
                      />
                    </label>
                  </article>
                );
              })}
            </div>

            <div className="hidden min-h-0 flex-1 overflow-auto md:block">
              <table className="w-[max(100%,980px)] border-collapse text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-[var(--aw-border-soft)] bg-[var(--aw-surface-muted)] text-[11px] font-black uppercase tracking-[0.1em] text-[var(--aw-muted)]">
                    <th className="px-5 py-4">Member</th>
                    <th className="px-5 py-4">Code</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Note</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--aw-border-soft)] text-sm text-[var(--aw-text)]">
                  {filteredMembers.map((member) => {
                    const row = attendanceRows[member.memberId] ?? {
                      memberId: member.memberId,
                      status: member.status,
                      note: member.note || "",
                    };

                    return (
                      <tr key={member.memberId} className="transition hover:bg-[var(--aw-primary-soft)]/50">
                        <td className="px-5 py-4">
                          <p className="font-black text-[var(--aw-text)]">{member.name}</p>
                          <p className="mt-1 text-xs font-semibold text-[var(--aw-muted)]">
                            {member.gender || "-"} · {member.phone || "-"}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-[var(--aw-muted)]">
                          {member.memberCode || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            {(["present", "absent", "excused"] as AttendanceStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setAttendanceStatus(member.memberId, status)}
                                className={[
                                  "rounded-full border px-3 py-1 text-xs font-black uppercase",
                                  statusButtonClass(row.status, status),
                                ].join(" ")}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <input
                            value={row.note}
                            onChange={(event) => setAttendanceNote(member.memberId, event.target.value)}
                            placeholder="Optional note"
                            className="min-h-10 w-full rounded-2xl border border-[var(--aw-border-soft)] bg-[var(--aw-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--aw-primary)]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminSectionPanel>
    </section>
  );
}
