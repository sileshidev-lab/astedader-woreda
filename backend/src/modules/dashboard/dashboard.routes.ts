import { Router } from "express";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";

const router = Router();

type AuthenticatedRequest = {
  user?: {
    role?: string;
  };
};

type DashboardHibretRow = {
  id: string;
  name: string;
  memberCount: number;
  targetedDirectives: number;
  submittedReports: number;
  pendingReports: number;
  attendanceRequiredDirectives: number;
  attendanceExpected: number;
  attendanceMarked: number;
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceExcused: number;
  reportSubmissionRate: number;
  attendanceCompletionRate: number;
  attendancePresentRate: number;
  attendanceScore: number;
  performanceScore: number;
};

function requireWoreda(req: AuthenticatedRequest, res: any) {
  if (req.user?.role !== "WOREDA_ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return false;
  }

  return true;
}

function canUsePrivilege(req: any, privilege: string) {
  const privileges = req.user?.privileges ?? [];
  return privileges.includes("*") || privileges.includes(privilege);
}

function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function list<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

router.get("/woreda/dashboard", authMiddleware, async (req, res) => {
  if (!requireWoreda(req as AuthenticatedRequest, res)) return;

  if (!canUsePrivilege(req, "woreda_analytics.read") && !canUsePrivilege(req, "analytics.read")) {
    return res.status(403).json({ message: "Permission denied" });
  }

  const [rawHibrets, rawAnnouncements, rawMembers] = await Promise.all([
    prisma.hibret.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),

    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        targets: {
          include: {
            hibret: true,
          },
        },
        reports: {
          include: {
            hibret: true,
          },
        },
        attendanceRecords: true,
      } as any,
    } as any),

    prisma.member.findMany({
      select: {
        id: true,
        hibretId: true,
        gender: true,
        membershipStatus: true,
        educationLevel: true,
        dateOfBirth: true,
      },
    }),
  ]);

  const hibrets = rawHibrets as any[];
  const announcements = rawAnnouncements as any[];
  const members = rawMembers as any[];

  const hibretRows: DashboardHibretRow[] = hibrets.map((hibret) => {
    const hibretId = String(hibret.id);
    const memberCount = Number(hibret._count?.members ?? 0);

    const targetedDirectives = announcements.filter((announcement) =>
      list(announcement.targets).some(
        (target: any) => String(target.hibretId || target.hibret?.id || target.id || "") === hibretId
      )
    );

    const submittedReports = targetedDirectives.filter((announcement) =>
      list(announcement.reports).some(
        (report: any) => String(report.hibretId || report.hibret?.id || "") === hibretId
      )
    );

    const attendanceRequiredDirectives = targetedDirectives.filter(
      (announcement) => Boolean(announcement.attendanceRequired)
    );

    const attendanceRecords = attendanceRequiredDirectives.flatMap((announcement) =>
      list(announcement.attendanceRecords).filter(
        (record: any) => String(record.hibretId || "") === hibretId
      )
    );

    const present = attendanceRecords.filter((record: any) => record.status === "present").length;
    const absent = attendanceRecords.filter((record: any) => record.status === "absent").length;
    const excused = attendanceRecords.filter((record: any) => record.status === "excused").length;
    const marked = present + absent + excused;

    const expectedAttendance = attendanceRequiredDirectives.length * memberCount;

    const reportSubmissionRate = rate(submittedReports.length, targetedDirectives.length);
    const attendanceCompletionRate = expectedAttendance ? rate(marked, expectedAttendance) : 0;
    const attendancePresentRate = expectedAttendance ? rate(present, expectedAttendance) : 0;

    const attendanceScore = expectedAttendance
      ? Math.round((attendanceCompletionRate + attendancePresentRate) / 2)
      : 0;

    const performanceScore = expectedAttendance
      ? Math.round(reportSubmissionRate * 0.65 + attendanceScore * 0.35)
      : reportSubmissionRate;

    return {
      id: hibret.id,
      name: hibret.name,
      memberCount,
      targetedDirectives: targetedDirectives.length,
      submittedReports: submittedReports.length,
      pendingReports: Math.max(targetedDirectives.length - submittedReports.length, 0),
      attendanceRequiredDirectives: attendanceRequiredDirectives.length,
      attendanceExpected: expectedAttendance,
      attendanceMarked: marked,
      attendancePresent: present,
      attendanceAbsent: absent,
      attendanceExcused: excused,
      reportSubmissionRate,
      attendanceCompletionRate,
      attendancePresentRate,
      attendanceScore,
      performanceScore,
    };
  });

  const latestFiveDirectives = announcements.slice(0, 5);

  const latestFiveExpectedAttendance = latestFiveDirectives.reduce(
    (sum: number, announcement: any) => {
      if (!announcement.attendanceRequired) return sum;

      return (
        sum +
        list(announcement.targets).reduce((targetSum: number, target: any) => {
          const hibretId = String(target.hibretId || target.hibret?.id || target.id || "");
          const hibretRow = hibretRows.find((row) => row.id === hibretId);
          return targetSum + Number(hibretRow?.memberCount ?? 0);
        }, 0)
      );
    },
    0
  );

  const latestFiveAttendanceRecords = latestFiveDirectives.flatMap((announcement: any) =>
    list(announcement.attendanceRecords)
  );

  const latestFivePresent = latestFiveAttendanceRecords.filter(
    (record: any) => record.status === "present"
  ).length;
  const latestFiveAbsent = latestFiveAttendanceRecords.filter(
    (record: any) => record.status === "absent"
  ).length;
  const latestFiveExcused = latestFiveAttendanceRecords.filter(
    (record: any) => record.status === "excused"
  ).length;
  const latestFiveMarked = latestFivePresent + latestFiveAbsent + latestFiveExcused;
  const latestFiveUnmarked = Math.max(latestFiveExpectedAttendance - latestFiveMarked, 0);

  const totalTargets = announcements.reduce(
    (sum: number, announcement: any) => sum + list(announcement.targets).length,
    0
  );

  const totalReports = announcements.reduce(
    (sum: number, announcement: any) => sum + list(announcement.reports).length,
    0
  );

  const totalExpectedAttendance = hibretRows.reduce(
    (sum, row) => sum + row.attendanceExpected,
    0
  );

  const totalMarkedAttendance = hibretRows.reduce(
    (sum, row) => sum + row.attendanceMarked,
    0
  );

  const totalPresentAttendance = hibretRows.reduce(
    (sum, row) => sum + row.attendancePresent,
    0
  );

  const normalizeGender = (value: unknown) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const maleMembers = members.filter((member: any) => {
    const gender = normalizeGender(member.gender);
    return (
      gender === "male" ||
      gender === "m" ||
      gender === "ወንድ" ||
      gender === "man" ||
      gender === "men"
    );
  }).length;

  const femaleMembers = members.filter((member: any) => {
    const gender = normalizeGender(member.gender);
    return (
      gender === "female" ||
      gender === "f" ||
      gender === "ሴት" ||
      gender === "woman" ||
      gender === "women"
    );
  }).length;

  const unknownGenderMembers = Math.max(members.length - maleMembers - femaleMembers, 0);

  const activeMembers = members.filter(
    (member: any) => String(member.membershipStatus || "").trim().toLowerCase() === "active"
  ).length;

  const candidateMembers = members.filter(
    (member: any) => String(member.membershipStatus || "").trim() === "ዕጩ አባል"
  ).length;

  // Education Level Distribution
  const educationDistribution: Record<string, number> = {};
  members.forEach((member: any) => {
    const education = String(member.educationLevel || "Other").trim();
    const normalized = education || "Other";
    educationDistribution[normalized] = (educationDistribution[normalized] || 0) + 1;
  });

  // Age Distribution
  const ageDistribution = { "18-30": 0, "31-45": 0, "46+": 0, "Unknown": 0 };
  const now = new Date();
  
  members.forEach((member: any) => {
    if (!member.dateOfBirth) {
      ageDistribution["Unknown"]++;
      return;
    }
    
    const birthDate = new Date(member.dateOfBirth);
    const age = now.getFullYear() - birthDate.getFullYear();
    
    if (age < 18) {
      ageDistribution["Unknown"]++;
    } else if (age <= 30) {
      ageDistribution["18-30"]++;
    } else if (age <= 45) {
      ageDistribution["31-45"]++;
    } else {
      ageDistribution["46+"]++;
    }
  });

  return res.json({
    summary: {
      hibrets: hibrets.length,
      members: members.length,
      activeMembers,
      candidateMembers,
      maleMembers,
      femaleMembers,
      unknownGenderMembers,
      directives: announcements.length,
      publishedDirectives: announcements.filter(
        (announcement: any) => announcement.status === "published"
      ).length,
      closedDirectives: announcements.filter(
        (announcement: any) => announcement.status === "closed"
      ).length,
      totalTargets,
      totalReports,
      submissionRate: rate(totalReports, totalTargets),
      attendanceExpected: totalExpectedAttendance,
      attendanceMarked: totalMarkedAttendance,
      attendancePresent: totalPresentAttendance,
      attendanceCompletionRate: rate(totalMarkedAttendance, totalExpectedAttendance),
      attendancePresentRate: rate(totalPresentAttendance, totalExpectedAttendance),
      latestFiveAttendance: {
        directiveCount: latestFiveDirectives.length,
        expected: latestFiveExpectedAttendance,
        marked: latestFiveMarked,
        present: latestFivePresent,
        absent: latestFiveAbsent,
        excused: latestFiveExcused,
        unmarked: latestFiveUnmarked,
        completionRate: rate(latestFiveMarked, latestFiveExpectedAttendance),
        presentRate: rate(latestFivePresent, latestFiveExpectedAttendance),
      },
      educationDistribution,
      ageDistribution,
    },
    hibretPerformance: hibretRows.sort(
      (a, b) => b.performanceScore - a.performanceScore
    ),
    recentDirectives: announcements.slice(0, 8).map((announcement: any) => ({
      id: announcement.id,
      title: announcement.title,
      type: announcement.type,
      status: announcement.status,
      deadline: announcement.deadline,
      targetCount: list(announcement.targets).length,
      reportCount: list(announcement.reports).length,
    })),
  });
});

export default router;
