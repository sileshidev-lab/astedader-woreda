import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Users } from "lucide-react";
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
import { LoadingState } from "../../../components/ui/LoadingState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/shadcn/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/shadcn/table";

type AttendanceDraftRow = {
  memberId: string;
  status: AttendanceStatus | null;
  note: string;
};

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "success" | "warning" | "danger" | "info" | "default";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--aw-success)]"
      : tone === "warning"
        ? "text-[var(--aw-warning)]"
        : tone === "danger"
          ? "text-[var(--aw-danger)]"
          : tone === "info"
            ? "text-[var(--aw-info)]"
            : "text-foreground";

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </span>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <p className={`text-2xl font-semibold tabular-nums leading-none ${toneClass}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function labelize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function HibretAttendancePage() {
  const { announcementId } = useParams();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [attendance, setAttendance] = useState<HibretAttendance | null>(null);
  const [attendanceRows, setAttendanceRows] = useState<Record<string, AttendanceDraftRow>>({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus | "unmarked">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    try {
      const records = Object.values(attendanceRows).filter(
        (row): row is AttendanceDraftRow & { status: AttendanceStatus } => Boolean(row.status),
      );

      const saved = await saveHibretAttendance(
        announcementId,
        records.map((row) => ({
          memberId: row.memberId,
          status: row.status,
          note: row.note || null,
        })),
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
      toast.success("Attendance saved successfully.");
    } catch {
      toast.error("Unable to save attendance.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading attendance..." />;
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <Button asChild variant="outline" size="sm">
              <Link
                to={`/hibret/announcements/${announcementId}`}
                className="inline-flex items-center gap-1.5"
              >
                <ArrowLeft aria-hidden />
                Back to directive
              </Link>
            </Button>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Attendance
            </p>
            <CardTitle className="text-base font-semibold">
              {announcement?.title || "Hibret member attendance"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Mark member attendance for this directive before submitting the Hibret report.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="default"
            size="default"
            onClick={saveAttendance}
            disabled={isSaving}
            className="ml-auto inline-flex items-center gap-2"
          >
            <Save aria-hidden />
            {isSaving ? "Saving..." : "Save attendance"}
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Members" value={summary.total} />
        <StatTile label="Marked" value={summary.marked} tone="info" />
        <StatTile label="Present" value={summary.present} tone="success" />
        <StatTile label="Absent" value={summary.absent} tone="danger" />
        <StatTile label="Excused" value={summary.excused} tone="warning" />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Attendance register</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Search, filter, and update each member.
            </CardDescription>
          </div>
          <div className="ml-auto grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:w-auto">
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search member, code, phone, or note"
              className="sm:w-64"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="excused">Excused</SelectItem>
                <SelectItem value="unmarked">Unmarked</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => {
                setSearchText("");
                setStatusFilter("all");
              }}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!attendance || filteredMembers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Users className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-sm text-muted-foreground">
                No members found. Try clearing your filters or check that this Hibret has
                members assigned.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const row = attendanceRows[member.memberId] ?? {
                    memberId: member.memberId,
                    status: member.status,
                    note: member.note || "",
                  };

                  return (
                    <TableRow key={member.memberId}>
                      <TableCell>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {member.gender || "-"} · {member.phone || "-"}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {member.memberCode || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(["present", "absent", "excused"] as AttendanceStatus[]).map(
                            (status) => (
                              <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={
                                  row.status === status
                                    ? status === "present"
                                      ? "success"
                                      : status === "absent"
                                        ? "destructive"
                                        : "default"
                                    : "outline"
                                }
                                onClick={() => setAttendanceStatus(member.memberId, status)}
                              >
                                {labelize(status)}
                              </Button>
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.note}
                          onChange={(event) =>
                            setAttendanceNote(member.memberId, event.target.value)
                          }
                          placeholder="Optional note"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
