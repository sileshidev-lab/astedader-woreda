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

type AttendanceDraftRow = {
  memberId: string;
  status: AttendanceStatus | null;
  note: string;
};

function statusButtonClass(current: AttendanceStatus | null, status: AttendanceStatus) {
  if (current === status) {
    if (status === "present") return "border-woreda-success bg-woreda-success text-white";
    if (status === "absent") return "border-woreda-danger bg-woreda-danger text-white";
    return "border-woreda-yellow bg-woreda-yellow text-white";
  }

  return "border-woreda-border bg-woreda-surface text-woreda-textMuted hover:border-woreda-primary hover:text-woreda-primary";
}

function metricTone(label: string) {
  if (label === "Present") return "text-woreda-success";
  if (label === "Absent") return "text-woreda-danger";
  if (label === "Excused") return "text-woreda-yellowText";
  if (label === "Marked") return "text-woreda-primary";
  return "text-woreda-text";
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
      if (statusFilter !== "all" && statusFilter !== "unmarked" && row?.status !== statusFilter) return false;

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
      <section className="aw-design-page border border-woreda-border bg-woreda-surface p-5 shadow-none">
        <p className="text-sm font-semibold text-woreda-textMuted">Loading attendance.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {error ? (
        <div className="border border-woreda-danger bg-woreda-dangerBg px-4 py-3 text-sm font-semibold text-woreda-danger">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="border border-woreda-success/20 bg-woreda-successBg px-4 py-3 text-sm font-semibold text-woreda-success">
          {message}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col overflow-hidden border border-woreda-border/70 bg-woreda-surface shadow-none md:max-h-[calc(var(--aw-viewport-block)-190px)]">
        <div className="flex flex-col gap-4 border-b border-woreda-border bg-woreda-surfaceLow px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-woreda-textMuted">
              Attendance
            </p>
            <h1 className="mt-1 max-w-5xl text-2xl font-black text-woreda-text">
              {announcement?.title || "Hibret member attendance"}
            </h1>
            <p className="mt-2 text-sm font-semibold text-woreda-textMuted">
              Mark member attendance for this directive before submitting the Hibret report.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/hibret/announcements/${announcementId}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
            >
              <ArrowLeft size={16} />
              Back to Directive
            </Link>

            <button
              type="button"
              onClick={saveAttendance}
              disabled={isSaving}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-woreda-primary bg-woreda-primary px-4 py-2 text-sm font-bold text-white hover:bg-woreda-sidebar disabled:opacity-60"
            >
              <Save size={16} />
              {isSaving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>

        <div className="grid gap-0 border-b border-woreda-border md:grid-cols-5">
          <AttendanceMetric label="Members" value={summary.total} />
          <AttendanceMetric label="Marked" value={summary.marked} />
          <AttendanceMetric label="Present" value={summary.present} />
          <AttendanceMetric label="Absent" value={summary.absent} />
          <AttendanceMetric label="Excused" value={summary.excused} />
        </div>

        <div className="aw-toolbar">
          <div className="flex min-h-10 border border-woreda-border bg-woreda-surface">
            <span className="flex items-center px-3 text-woreda-textMuted">
              <Search size={15} />
            </span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search member, code, phone, or note"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="min-h-10 border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none"
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
            className="min-h-10 border border-woreda-border bg-woreda-surface px-4 py-2 text-sm font-bold text-woreda-text hover:border-woreda-primary hover:text-woreda-primary"
          >
            Clear
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {!attendance || filteredMembers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users size={32} className="mx-auto text-woreda-textMuted" />
              <p className="mt-3 text-sm font-semibold text-woreda-textMuted">
                No members found.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-woreda-surfaceLow text-[11px] uppercase tracking-[0.16em] text-woreda-textMuted">
                <tr>
                  <th className="border-b border-woreda-border px-4 py-3">Member</th>
                  <th className="border-b border-woreda-border px-4 py-3">Code</th>
                  <th className="border-b border-woreda-border px-4 py-3">Status</th>
                  <th className="border-b border-woreda-border px-4 py-3">Note</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const row = attendanceRows[member.memberId] ?? {
                    memberId: member.memberId,
                    status: member.status,
                    note: member.note || "",
                  };

                  return (
                    <tr key={member.memberId} className="hover:bg-woreda-surfaceLow">
                      <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                        <p className="font-black text-woreda-text">{member.name}</p>
                        <p className="mt-1 text-xs font-semibold text-woreda-textMuted">
                          {member.gender || "-"} · {member.phone || "-"}
                        </p>
                      </td>

                      <td className="border-b border-woreda-borderLight/50 px-4 py-3 text-woreda-textMuted">
                        {member.memberCode || "-"}
                      </td>

                      <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {(["present", "absent", "excused"] as AttendanceStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setAttendanceStatus(member.memberId, status)}
                              className={[
                                "border px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em]",
                                statusButtonClass(row.status, status),
                              ].join(" ")}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="border-b border-woreda-borderLight/50 px-4 py-3">
                        <input
                          value={row.note}
                          onChange={(event) => setAttendanceNote(member.memberId, event.target.value)}
                          placeholder="Optional note"
                          className="min-h-9 w-full border border-woreda-border bg-woreda-surface px-3 py-2 text-sm outline-none focus:border-woreda-primary"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

function AttendanceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-woreda-border bg-woreda-surface px-4 py-3 md:border-b-0 md:border-r last:md:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-woreda-textMuted">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${metricTone(label)}`}>{value}</p>
    </div>
  );
}
