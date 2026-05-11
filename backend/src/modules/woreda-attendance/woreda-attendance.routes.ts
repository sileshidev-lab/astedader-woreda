import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";

const router = Router();

function fullName(member: any) {
  return [member.firstName, member.fatherName, member.grandfatherName]
    .filter(Boolean)
    .join(" ");
}

router.get(
  "/announcements/:announcementId/hibrets/:hibretId/attendance",
  authMiddleware,
  requirePrivilege("attendance.read"),
  async (req: any, res) => {
    if (req.user?.role !== "WOREDA_ADMIN") {
      return res.status(403).json({ message: "Only Woreda admins can view this attendance." });
    }

    const { announcementId, hibretId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: String(announcementId) },
      select: {
        id: true,
        title: true,
        status: true,
        attendanceRequired: true,
      },
    });

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    const hibret = await prisma.hibret.findUnique({
      where: { id: String(hibretId) },
      select: {
        id: true,
        name: true,
      },
    });

    if (!hibret) {
      return res.status(404).json({ message: "Hibret not found." });
    }

    const members: any[] = await prisma.member.findMany({
      where: { hibretId: String(hibretId) },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { firstName: "asc" },
        { fatherName: "asc" },
      ],
    });

    const records: any[] = await prisma.attendanceRecord.findMany({
      where: {
        announcementId: String(announcementId),
        hibretId: String(hibretId),
      },
    });

    const recordByMemberId = new Map<string, any>(
      records.map((record: any) => [record.memberId, record])
    );

    const attendanceMembers = members.map((member: any) => {
      const record = recordByMemberId.get(member.id);

      return {
        memberId: member.id,
        memberCode: member.memberCode,
        fanId: member.fanId,
        ppId: member.ppId,
        name: fullName(member),
        gender: member.gender,
        phone: member.phone,
        familyName: member.family?.name ?? null,
        status: record?.status ?? null,
        note: record?.note ?? null,
        recordedAt: record?.updatedAt ?? record?.createdAt ?? null,
      };
    });

    const total = attendanceMembers.length;
    const marked = attendanceMembers.filter((member: any) => Boolean(member.status)).length;
    const present = attendanceMembers.filter((member: any) => member.status === "present").length;
    const absent = attendanceMembers.filter((member: any) => member.status === "absent").length;
    const excused = attendanceMembers.filter((member: any) => member.status === "excused").length;

    return res.json({
      attendance: {
        announcement,
        hibret,
        summary: {
          total,
          marked,
          unmarked: Math.max(total - marked, 0),
          present,
          absent,
          excused,
          attendanceRate: total ? Math.round((present / total) * 100) : 0,
          completionRate: total ? Math.round((marked / total) * 100) : 0,
        },
        members: attendanceMembers,
      },
    });
  }
);

export default router;
