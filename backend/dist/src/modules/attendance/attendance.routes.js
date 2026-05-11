"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const attendance_schemas_1 = require("./attendance.schemas");
const router = (0, express_1.Router)();
function isWoredaAdmin(role) {
    return role === "WOREDA_ADMIN";
}
function isHibretAdmin(role) {
    return role === "HIBRET_ADMIN";
}
function canUsePrivilege(privileges, privilege) {
    return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}
function memberName(member) {
    return [member.firstName, member.fatherName, member.grandfatherName]
        .filter(Boolean)
        .join(" ");
}
async function buildAttendancePayload(announcementId, hibretId) {
    const [announcement, hibret, members, records] = await Promise.all([
        client_1.prisma.announcement.findUnique({
            where: { id: announcementId },
        }),
        client_1.prisma.hibret.findUnique({
            where: { id: hibretId },
            select: {
                id: true,
                name: true,
            },
        }),
        client_1.prisma.member.findMany({
            where: {
                hibretId,
            },
            orderBy: [
                { firstName: "asc" },
                { fatherName: "asc" },
            ],
        }),
        client_1.prisma.attendanceRecord.findMany({
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
router.get("/hibret/announcements/:announcementId/attendance", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "attendance.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const announcementId = String(req.params.announcementId);
    const hibretId = req.user.hibretId;
    const target = await client_1.prisma.announcementTarget.findFirst({
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
router.post("/hibret/announcements/:announcementId/attendance", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isHibretAdmin(req.user?.role) || !req.user?.hibretId) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "attendance.update")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const parsed = attendance_schemas_1.saveAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid attendance data",
            errors: parsed.error.flatten(),
        });
    }
    const existingReport = await client_1.prisma.hibretReport.findUnique({
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
    if (existingReport?.submittedAt ||
        existingReport?.status === "submitted" ||
        existingReport?.status === "approved" ||
        existingReport?.status === "rejected" ||
        existingReport?.status === "changes_requested") {
        return res.status(409).json({
            message: "Attendance is locked after the Hibret report has been submitted to Woreda.",
        });
    }
    const announcementId = String(req.params.announcementId);
    const hibretId = req.user.hibretId;
    const announcement = await client_1.prisma.announcement.findUnique({
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
    const target = await client_1.prisma.announcementTarget.findFirst({
        where: {
            announcementId,
            hibretId,
        },
    });
    if (!target) {
        return res.status(404).json({ message: "Announcement not assigned to this Hibret" });
    }
    const memberIds = parsed.data.records.map((record) => record.memberId);
    const validMembers = await client_1.prisma.member.findMany({
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
    await client_1.prisma.$transaction(parsed.data.records.map((record) => client_1.prisma.attendanceRecord.upsert({
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
    })));
    const payload = await buildAttendancePayload(announcementId, hibretId);
    return res.json({ attendance: payload });
});
router.get("/woreda/announcements/:announcementId/hibrets/:hibretId/attendance", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!isWoredaAdmin(req.user?.role)) {
        return res.status(403).json({ message: "Permission denied" });
    }
    if (!canUsePrivilege(req.user.privileges, "attendance.read")) {
        return res.status(403).json({ message: "Permission denied" });
    }
    const payload = await buildAttendancePayload(String(req.params.announcementId), String(req.params.hibretId));
    if (!payload) {
        return res.status(404).json({ message: "Attendance context not found" });
    }
    return res.json({ attendance: payload });
});
exports.default = router;
