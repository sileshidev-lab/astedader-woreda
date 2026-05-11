import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { saveAttendanceSchema } from "./attendance.schemas";

const router = Router();

function isWoredaAdmin(role?: string) {
  return role === "WOREDA_ADMIN";
}

function isHibretAdmin(role?: string) {
  return role === "HIBRET_ADMIN";
}

function canUsePrivilege(privileges: string[] | undefined, privilege: string) {
  return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}

function memberName(member: {
  firstName: string;
  fatherName: string;
  grandfatherName?: string | null;
}) {
  return [member.firstName, member.fatherName, member.grandfatherName]
    .filter(Boolean)
    .join(" ");
}

async function buildAttendancePayload(announcementId: string, hibretId: string) {
  const [announcement, hibret, members, records] = await Promise.all([
    prisma.announcement.findUnique({
      where: { id: announcementId },
    }),
    prisma.hibret.findUnique({
      where: { id: hibretId },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.member.findMany({
      where: {
        hibretId,
      },
      orderBy: [
        { firstName: "asc" },
        { fatherName: "asc" },
      ],
    }),
    prisma.attendanceRecord.findMany({
      where: {
        announcementId,
        hibretId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  if (!announcement || !hibret) {
    return null;
  }

  const recordByMemberId = new Map(records.map((record) => [record.memberId, record]));

  const rows = members.map((member) => {
    const record = recordByMemberId.get(member.id);

    return {
      memberId: member.id,
      memberCode: member.memberCode,
      fanId: member.fanId,
      ppId: member.ppId,
      name: memberName(member),
      gender: member.gender,
      phone: member.phone,
      status: record?.status ?? null,
      note: record?.note ?? null,
      recordedAt: record?.updatedAt ?? null,
    };
  });

  const present = rows.filter((row) => row.status === "present").length;
  const absent = rows.filter((row) => row.status === "absent").length;
  const excused = rows.filter((row) => row.status === "excused").length;
  const marked = rows.filter((row) => row.status !== null).length;
  const total = rows.length;

  return {
    announcement: {
      id: announcement.id,
      title: announcement.title,
      attendanceRequired: announcement.attendanceRequired,
      status: announcement.status,
    },
    hibret,
    summary: {
      total,
      marked,
      unmarked: Math.max(total - marked, 0),
      present,
      absent,
      excused,
      attendanceRate: total === 0 ? 0 : Math.round((present / total) * 100),
      completionRate: total === 0 ? 100 : Math.round((marked / total) * 100),
    },
    members: rows,
  };
}

router.get("/hibret/announcements/:announcementId/attendance", authMiddleware, async (req, res) => {
  if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
    return res.status(403).json({ message: "Permission denied" });
  }

  if (!canUsePrivilege(req.user.privileges, "attendance.read")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const announcementId = String(req.params.announcementId);
  const hibretId = req.user.hibretId;

  const target = await prisma.announcementTarget.findFirst({
    where: {
      announcementId,
      hibretId,
    },
  });

  if (!target) {
    return res.status(404).json({ message: "Announcement not assigned to this Hibret" });
  }

  const payload = await buildAttendancePayload(announcementId, hibretId);

  if (!payload) {
    return res.status(404).json({ message: "Attendance context not found" });
  }

  return res.json({ attendance: payload });
});

router.post("/hibret/announcements/:announcementId/attendance", authMiddleware, async (req, res) => {
  if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
    return res.status(403).json({ message: "Permission denied" });
  }

  if (!canUsePrivilege(req.user.privileges, "attendance.update")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const parsed = saveAttendanceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid attendance data",
      errors: parsed.error.flatten(),
    });
  }


  const existingReport = await prisma.hibretReport.findUnique({
    where: {
      announcementId_hibretId: {
        announcementId: String(req.params.announcementId),
        hibretId: String(req.user.hibretId),
      },
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
    },
  });

  if (
    existingReport?.submittedAt ||
    existingReport?.status === "submitted" ||
    existingReport?.status === "approved" ||
    existingReport?.status === "rejected" ||
    existingReport?.status === "changes_requested"
  ) {
    return res.status(409).json({
      message: "Attendance is locked after the Hibret report has been submitted to Woreda.",
    });
  }

  const announcementId = String(req.params.announcementId);
  const hibretId = req.user.hibretId;

  const announcement = await prisma.announcement.findUnique({
    where: {
      id: announcementId,
    },
  });

  if (!announcement) {
    return res.status(404).json({ message: "Announcement not found" });
  }

  if (!announcement.attendanceRequired) {
    return res.status(409).json({ message: "Attendance is not required for this directive" });
  }

  const target = await prisma.announcementTarget.findFirst({
    where: {
      announcementId,
      hibretId,
    },
  });

  if (!target) {
    return res.status(404).json({ message: "Announcement not assigned to this Hibret" });
  }

  const memberIds = parsed.data.records.map((record) => record.memberId);
  const validMembers = await prisma.member.findMany({
    where: {
      id: {
        in: memberIds,
      },
      hibretId,
    },
    select: {
      id: true,
    },
  });

  const validMemberIds = new Set(validMembers.map((member) => member.id));

  const invalidMemberId = memberIds.find((memberId) => !validMemberIds.has(memberId));

  if (invalidMemberId) {
    return res.status(400).json({
      message: "One or more members do not belong to this Hibret",
      memberId: invalidMemberId,
    });
  }

  await prisma.$transaction(
    parsed.data.records.map((record) =>
      prisma.attendanceRecord.upsert({
        where: {
          announcementId_hibretId_memberId: {
            announcementId,
            hibretId,
            memberId: record.memberId,
          },
        },
        create: {
          announcementId,
          hibretId,
          memberId: record.memberId,
          status: record.status,
          note: record.note,
          recordedById: req.user?.id,
        },
        update: {
          status: record.status,
          note: record.note,
          recordedById: req.user?.id,
        },
      })
    )
  );

  const payload = await buildAttendancePayload(announcementId, hibretId);

  return res.json({ attendance: payload });
});

router.get("/woreda/announcements/:announcementId/hibrets/:hibretId/attendance", authMiddleware, async (req, res) => {
  if (!isWoredaAdmin(req.user?.role)) {
    return res.status(403).json({ message: "Permission denied" });
  }

  if (!canUsePrivilege(req.user.privileges, "attendance.read")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const payload = await buildAttendancePayload(
    String(req.params.announcementId),
    String(req.params.hibretId)
  );

  if (!payload) {
    return res.status(404).json({ message: "Attendance context not found" });
  }

  return res.json({ attendance: payload });
});

export default router;
