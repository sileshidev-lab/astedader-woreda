"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const exceljs_1 = __importDefault(require("exceljs"));
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const pdf_translations_1 = require("./pdf-translations");
const router = (0, express_1.Router)();
function safeName(value) {
    return value
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\s+/g, "_")
        .slice(0, 120);
}
function safeAsciiDownloadName(value, fallback = "export") {
    const cleaned = String(value || fallback)
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120);
    return cleaned || fallback;
}
function setAttachmentHeader(res, filename) {
    const safeFilename = safeAsciiDownloadName(filename);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
}
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function formatDate(value) {
    if (!value)
        return "-";
    return new Date(value).toLocaleString();
}
function isImage(mimeType) {
    return Boolean(mimeType?.startsWith("image/"));
}
function isWoredaUser(req) {
    return req.user?.role === "WOREDA_ADMIN";
}
function requireWoreda(req, res) {
    if (!isWoredaUser(req)) {
        res.status(403).json({ message: "Permission denied" });
        return false;
    }
    return true;
}
function canUsePrivilege(req, privilege) {
    const privileges = req.user?.privileges ?? [];
    return privileges.includes("*") || privileges.includes(privilege);
}
function requireExportPrivilege(req, res, privilege = "report.export") {
    if (canUsePrivilege(req, privilege) || canUsePrivilege(req, "announcement.export")) {
        return true;
    }
    res.status(403).json({ message: "Permission denied" });
    return false;
}
function buildAttendanceCsv(records) {
    const rows = [
        [
            "Member Full Name",
            "Member Code",
            "FAN ID",
            "PP ID",
            "Family",
            "Gender",
            "Phone",
            "Attendance Status",
            "Note",
            "Recorded At",
        ],
        ...records.map((record) => [
            [record.member?.firstName, record.member?.fatherName, record.member?.grandfatherName]
                .filter(Boolean)
                .join(" "),
            record.member?.memberCode || "",
            record.member?.fanId || "",
            record.member?.ppId || "",
            record.member?.family?.name || "",
            record.member?.gender || "",
            record.member?.phone || "",
            record.status || "",
            record.note || "",
            formatDate(record.updatedAt || record.createdAt),
        ]),
    ];
    return rows
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
}
async function getAttendanceForReport(report) {
    return client_1.prisma.attendanceRecord.findMany({
        where: {
            announcementId: report.announcementId,
            hibretId: report.hibretId,
        },
        include: {
            member: {
                include: {
                    family: true,
                },
            },
        },
        orderBy: {
            updatedAt: "asc",
        },
    });
}
function memberFullName(member) {
    return [member?.firstName, member?.fatherName, member?.grandfatherName]
        .filter(Boolean)
        .join(" ");
}
async function getAttendanceExportContext(announcementId, hibretId) {
    const [announcement, hibret, members, records] = await Promise.all([
        client_1.prisma.announcement.findUnique({
            where: { id: announcementId },
        }),
        client_1.prisma.hibret.findUnique({
            where: { id: hibretId },
            select: { id: true, name: true },
        }),
        client_1.prisma.member.findMany({
            where: { hibretId },
            include: { family: true },
            orderBy: [{ firstName: "asc" }, { fatherName: "asc" }],
        }),
        client_1.prisma.attendanceRecord.findMany({
            where: { announcementId, hibretId },
            include: {
                member: {
                    include: {
                        family: true,
                    },
                },
            },
        }),
    ]);
    if (!announcement || !hibret)
        return null;
    const recordByMemberId = new Map(records.map((record) => [record.memberId, record]));
    const rows = members.map((member) => {
        const record = recordByMemberId.get(member.id);
        return {
            memberName: memberFullName(member),
            memberCode: member.memberCode || "",
            fanId: member.fanId || "",
            ppId: member.ppId || "",
            family: member.family?.name || "",
            gender: member.gender || "",
            phone: member.phone || "",
            status: record?.status || "unmarked",
            note: record?.note || "",
            recordedAt: record?.updatedAt || record?.createdAt || null,
        };
    });
    const present = rows.filter((row) => row.status === "present").length;
    const absent = rows.filter((row) => row.status === "absent").length;
    const excused = rows.filter((row) => row.status === "excused").length;
    const marked = rows.filter((row) => row.status !== "unmarked").length;
    const total = rows.length;
    return {
        announcement,
        hibret,
        rows,
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
    };
}
function buildAttendanceExportCsv(context) {
    const headerRows = [
        ["Directive", context.announcement.title],
        ["Hibret", context.hibret.name],
        ["Attendance Required", context.announcement.attendanceRequired ? "Yes" : "No"],
        ["Members", context.summary.total],
        ["Marked", context.summary.marked],
        ["Unmarked", context.summary.unmarked],
        ["Present", context.summary.present],
        ["Absent", context.summary.absent],
        ["Excused", context.summary.excused],
        ["Attendance Rate", `${context.summary.attendanceRate}%`],
        ["Completion Rate", `${context.summary.completionRate}%`],
        [],
    ];
    const rows = [
        ...headerRows,
        [
            "Member Full Name",
            "Member Code",
            "FAN ID",
            "PP ID",
            "Family",
            "Gender",
            "Phone",
            "Attendance Status",
            "Note",
            "Recorded At",
        ],
        ...context.rows.map((row) => [
            row.memberName,
            row.memberCode,
            row.fanId,
            row.ppId,
            row.family,
            row.gender,
            row.phone,
            row.status,
            row.note,
            formatDate(row.recordedAt),
        ]),
    ];
    return rows
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
}
async function buildAttendanceWorkbookBuffer(context) {
    const workbook = new exceljs_1.default.Workbook();
    workbook.creator = "Astedader Woreda";
    workbook.created = new Date();
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
        { header: "Metric", key: "metric", width: 28 },
        { header: "Value", key: "value", width: 42 },
    ];
    summarySheet.addRows([
        { metric: "Directive", value: context.announcement.title },
        { metric: "Hibret", value: context.hibret.name },
        { metric: "Attendance Required", value: context.announcement.attendanceRequired ? "Yes" : "No" },
        { metric: "Members", value: context.summary.total },
        { metric: "Marked", value: context.summary.marked },
        { metric: "Unmarked", value: context.summary.unmarked },
        { metric: "Present", value: context.summary.present },
        { metric: "Absent", value: context.summary.absent },
        { metric: "Excused", value: context.summary.excused },
        { metric: "Attendance Rate", value: `${context.summary.attendanceRate}%` },
        { metric: "Completion Rate", value: `${context.summary.completionRate}%` },
    ]);
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getColumn("metric").font = { bold: true };
    const memberStartRow = summarySheet.rowCount + 3;
    summarySheet.getCell(`A${memberStartRow}`).value = "Member Attendance Records";
    summarySheet.getCell(`A${memberStartRow}`).font = { bold: true, size: 13 };
    const headerRowNumber = memberStartRow + 1;
    const headerRow = summarySheet.getRow(headerRowNumber);
    headerRow.values = [
        "Member Full Name",
        "Member Code",
        "FAN ID",
        "PP ID",
        "Family",
        "Gender",
        "Phone",
        "Attendance Status",
        "Note",
        "Recorded At",
    ];
    headerRow.font = { bold: true };
    context.rows.forEach((row) => {
        summarySheet.addRow([
            row.memberName,
            row.memberCode,
            row.fanId,
            row.ppId,
            row.family,
            row.gender,
            row.phone,
            row.status,
            row.note,
            formatDate(row.recordedAt),
        ]);
    });
    summarySheet.autoFilter = {
        from: `A${headerRowNumber}`,
        to: `J${headerRowNumber}`,
    };
    summarySheet.columns = [
        { width: 28 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 24 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 28 },
        { width: 24 },
    ];
    const recordsSheet = workbook.addWorksheet("Attendance Records");
    recordsSheet.columns = [
        { header: "Member Full Name", key: "memberName", width: 28 },
        { header: "Member Code", key: "memberCode", width: 18 },
        { header: "FAN ID", key: "fanId", width: 18 },
        { header: "PP ID", key: "ppId", width: 18 },
        { header: "Family", key: "family", width: 24 },
        { header: "Gender", key: "gender", width: 12 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Attendance Status", key: "status", width: 18 },
        { header: "Note", key: "note", width: 28 },
        { header: "Recorded At", key: "recordedAt", width: 24 },
    ];
    recordsSheet.addRows(context.rows.map((row) => ({
        ...row,
        recordedAt: formatDate(row.recordedAt),
    })));
    recordsSheet.getRow(1).font = { bold: true };
    recordsSheet.autoFilter = {
        from: "A1",
        to: "J1",
    };
    return workbook.xlsx.writeBuffer();
}
function addReportAttachmentsToArchive(archive, report, reportFolder = "") {
    for (const attachment of report.attachments ?? []) {
        const file = attachment.file;
        if (!file?.path)
            continue;
        const absolutePath = path_1.default.resolve(file.path);
        if (!fs_1.default.existsSync(absolutePath))
            continue;
        const targetFolder = isImage(file.mimeType)
            ? `${reportFolder}attachments/media`
            : `${reportFolder}attachments/documents`;
        archive.file(absolutePath, {
            name: `${targetFolder}/${safeName(file.originalName)}`,
        });
    }
}
async function sendReportPackageZip(res, report) {
    const attendanceRecords = await getAttendanceForReport(report);
    const archiveName = `${safeName(report.title || "hibret-report")}-package.zip`;
    res.setHeader("Content-Type", "application/zip");
    setAttachmentHeader(res, archiveName);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
        throw error;
    });
    archive.pipe(res);
    const t = (0, pdf_translations_1.getPdfTranslation)("en");
    const reportPdf = await htmlToPdfBuffer(buildReportHtml(report), t);
    archive.append(Buffer.from(reportPdf), {
        name: "Official-Hibret-Report.pdf",
    });
    archive.append(buildAttendanceCsv(attendanceRecords), {
        name: "attendance/attendance.csv",
    });
    addReportAttachmentsToArchive(archive, report);
    return archive.finalize();
}
function buildReportHtml(report) {
    const attachments = report.attachments ?? [];
    const reviewHistory = report.reviews ?? [];
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #191C1D;
      line-height: 1.55;
      margin: 32px;
    }
    h1, h2, h3 {
      color: #004C6B;
      margin-bottom: 8px;
    }
    .meta {
      border: 1px solid #D7DEE5;
      background: #F8F9FA;
      padding: 14px;
      margin: 16px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 8px 16px;
      font-size: 14px;
    }
    .label {
      font-weight: 700;
      color: #70787F;
    }
    .section {
      margin-top: 24px;
    }
    .box {
      border: 1px solid #D7DEE5;
      padding: 14px;
      background: #fff;
      white-space: pre-wrap;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 10px;
      font-size: 13px;
    }
    th, td {
      border: 1px solid #D7DEE5;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #F2F4F5;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(report.title)}</h1>
  <p><strong>Hibret:</strong> ${escapeHtml(report.hibret?.name)}</p>
  <p><strong>Directive:</strong> ${escapeHtml(report.announcement?.title)}</p>

  <div class="meta">
    <div class="meta-grid">
      <div class="label">Report status</div>
      <div>${escapeHtml(report.status)}</div>

      <div class="label">Review decision</div>
      <div>${escapeHtml(report.reviewDecision || "Pending")}</div>

      <div class="label">Submitted at</div>
      <div>${escapeHtml(formatDate(report.submittedAt))}</div>

      <div class="label">Reviewed at</div>
      <div>${escapeHtml(formatDate(report.reviewedAt))}</div>

      <div class="label">Attachments</div>
      <div>${attachments.length}</div>
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="box">${escapeHtml(report.summary || "No summary provided.")}</div>
  </div>

  <div class="section">
    <h2>Report Body</h2>
    <div class="box">${escapeHtml(report.body)}</div>
  </div>

  <div class="section">
    <h2>Review Comment</h2>
    <div class="box">${escapeHtml(report.reviewComment || "No review comment provided.")}</div>
  </div>

  <div class="section">
    <h2>Attachments</h2>
    <table>
      <thead>
        <tr>
          <th>File name</th>
          <th>Type</th>
          <th>Size bytes</th>
        </tr>
      </thead>
      <tbody>
        ${attachments.length
        ? attachments
            .map((attachment) => `<tr>
                    <td>${escapeHtml(attachment.file.originalName)}</td>
                    <td>${escapeHtml(attachment.file.mimeType)}</td>
                    <td>${escapeHtml(String(attachment.file.sizeBytes ?? ""))}</td>
                  </tr>`)
            .join("")
        : `<tr><td colspan="3">No attachments.</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Review History</h2>
    <table>
      <thead>
        <tr>
          <th>Decision</th>
          <th>Comment</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${reviewHistory.length
        ? reviewHistory
            .map((review) => `<tr>
                    <td>${escapeHtml(review.decision)}</td>
                    <td>${escapeHtml(review.comment || "No comment provided.")}</td>
                    <td>${escapeHtml(formatDate(review.createdAt))}</td>
                  </tr>`)
            .join("")
        : `<tr><td colspan="3">No review history.</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
async function getReportForExport(reportId) {
    return client_1.prisma.hibretReport.findUnique({
        where: { id: reportId },
        include: {
            announcement: true,
            hibret: true,
            attachments: {
                include: {
                    file: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
            reviews: {
                orderBy: {
                    createdAt: "asc",
                },
            },
        },
    });
}
router.get("/announcements/export.csv", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "announcement.export"))
        return;
    const announcements = await client_1.prisma.announcement.findMany({
        include: {
            targets: true,
            reports: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    const rows = [
        ["Title", "Type", "Status", "Deadline", "Hibrets", "Reports", "Created At"],
        ...announcements.map((announcement) => [
            announcement.title,
            announcement.type,
            announcement.status,
            announcement.deadline ? announcement.deadline.toISOString() : "",
            String((announcement.targets?.length ?? announcement.hibrets?.length ?? 0)),
            String(announcement.reports.length),
            announcement.createdAt.toISOString(),
        ]),
    ];
    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=directives.csv");
    return res.send(csv);
});
router.get("/announcements/:announcementId/reports.csv", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "announcement.export"))
        return;
    const reports = await client_1.prisma.hibretReport.findMany({
        where: {
            announcementId: String(req.params.announcementId),
        },
        include: {
            hibret: true,
            attachments: true,
        },
        orderBy: {
            submittedAt: "desc",
        },
    });
    const rows = [
        ["Hibret", "Report Title", "Status", "Review", "Submitted At", "Reviewed At", "Attachments"],
        ...reports.map((report) => [
            report.hibret.name,
            report.title,
            report.status,
            report.reviewDecision || "Pending",
            report.submittedAt ? report.submittedAt.toISOString() : "",
            report.reviewedAt ? report.reviewedAt.toISOString() : "",
            String(report.attachments.length),
        ]),
    ];
    const csv = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=performance-report.csv");
    return res.send(csv);
});
router.get("/announcements/:announcementId/export.zip", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "announcement.export"))
        return;
    const announcement = await client_1.prisma.announcement.findUnique({
        where: {
            id: String(req.params.announcementId),
        },
        include: {
            attachments: {
                include: {
                    file: true,
                },
            },
            reports: {
                include: {
                    hibret: true,
                    attachments: {
                        include: {
                            file: true,
                        },
                    },
                    reviews: true,
                },
            },
        },
    });
    if (!announcement) {
        return res.status(404).json({ message: "Directive not found" });
    }
    const archiveName = `${safeName(announcement.title)}-directive-package.zip`;
    res.setHeader("Content-Type", "application/zip");
    setAttachmentHeader(res, archiveName);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
        throw error;
    });
    archive.pipe(res);
    const t = (0, pdf_translations_1.getPdfTranslation)(req.query.lang);
    const lang = (0, pdf_translations_1.getPdfLang)(req.query.lang);
    const reportHtml = formalReportHtml(t.directiveReportSummary, `${t.directive}: ${announcement.title}`, announcementSectionHtml(announcement, t, true), t);
    const reportPdf = await htmlToPdfBuffer(reportHtml, t);
    archive.append(Buffer.from(reportPdf), {
        name: `Executive-Directive-Performance-Report-${lang}.pdf`,
    });
    for (const attachment of announcement.attachments) {
        const file = attachment.file;
        const absolutePath = path_1.default.resolve(file.path);
        if (fs_1.default.existsSync(absolutePath)) {
            archive.file(absolutePath, {
                name: `directive-attachments/${safeName(file.originalName)}`,
            });
        }
    }
    for (const report of announcement.reports) {
        const reportFolder = `reports/${safeName(report.hibret.name)}-${safeName(report.title)}`;
        for (const attachment of report.attachments ?? []) {
            const file = attachment.file;
            const absolutePath = path_1.default.resolve(file.path);
            if (fs_1.default.existsSync(absolutePath)) {
                const folder = isImage(file.mimeType)
                    ? `${reportFolder}/attachments/images`
                    : `${reportFolder}/attachments/documents`;
                archive.file(absolutePath, {
                    name: `${folder}/${safeName(file.originalName)}`,
                });
            }
        }
    }
    return archive.finalize();
});
router.get("/woreda/reports/:reportId/export.html", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "report.export"))
        return;
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName(report.title)}-report.html"`);
    return res.send(buildReportHtml(report));
});
router.get("/woreda/reports/:reportId/package.zip", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "report.export"))
        return;
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    return sendReportPackageZip(res, report);
});
router.get("/hibret/reports/:reportId/export.html", auth_middleware_1.authMiddleware, async (req, res) => {
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (req.user?.role !== "HIBRET_ADMIN" || report.hibretId !== req.user?.hibretId) {
        return res.status(403).json({ message: "You can only export your own Hibret reports." });
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName(report.title)}-report.html"`);
    return res.send(buildReportHtml(report));
});
router.get("/hibret/reports/:reportId/package.zip", auth_middleware_1.authMiddleware, async (req, res) => {
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    if (req.user?.role !== "HIBRET_ADMIN" || report.hibretId !== req.user?.hibretId) {
        return res.status(403).json({ message: "You can only export your own Hibret reports." });
    }
    return sendReportPackageZip(res, report);
});
router.get("/woreda/reports/:reportId/attachments.zip", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "report.export"))
        return;
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    const archiveName = `${safeName(report.title)}-attachments.zip`;
    res.setHeader("Content-Type", "application/zip");
    setAttachmentHeader(res, archiveName);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
        throw error;
    });
    archive.pipe(res);
    addReportAttachmentsToArchive(archive, report);
    return archive.finalize();
});
router.get("/woreda/reports/:reportId/export.zip", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "report.export"))
        return;
    const report = await getReportForExport(String(req.params.reportId));
    if (!report) {
        return res.status(404).json({ message: "Report not found" });
    }
    const archiveName = `${safeName(report.title)}-report-package.zip`;
    res.setHeader("Content-Type", "application/zip");
    setAttachmentHeader(res, archiveName);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
        throw error;
    });
    archive.pipe(res);
    const t = (0, pdf_translations_1.getPdfTranslation)(req.query.lang || "en");
    const reportPdf = await htmlToPdfBuffer(buildReportHtml(report), t);
    archive.append(Buffer.from(reportPdf), {
        name: "Official-Hibret-Report.pdf",
    });
    addReportAttachmentsToArchive(archive, report);
    return archive.finalize();
});
function findExistingPath(paths) {
    return paths.find((candidate) => candidate && fs_1.default.existsSync(candidate));
}
function getPdfLogoPath() {
    return findExistingPath([
        path_1.default.resolve(process.cwd(), "../frontend/public/Prosperity_Party_logo.png"),
        path_1.default.resolve(process.cwd(), "../frontend/public/prosperity-party-logo.png"),
        path_1.default.resolve(process.cwd(), "public/Prosperity_Party_logo.png"),
        path_1.default.resolve(process.cwd(), "uploads/Prosperity_Party_logo.png"),
    ]);
}
function getPdfFontPath() {
    return findExistingPath([
        process.env.ASTEDADER_PDF_FONT || "",
        "/usr/share/fonts/truetype/noto/NotoSansEthiopic-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSansEthiopic-Regular.otf",
        "/usr/share/fonts/truetype/noto/NotoSerifEthiopic-Regular.ttf",
        "/usr/share/fonts/opentype/noto/NotoSerifEthiopic-Regular.otf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]);
}
function fileToDataUri(filePath) {
    if (!filePath || !fs_1.default.existsSync(filePath))
        return "";
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mime = ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".svg"
                ? "image/svg+xml"
                : "application/octet-stream";
    return `data:${mime};base64,${fs_1.default.readFileSync(filePath).toString("base64")}`;
}
function fontToDataUri(filePath) {
    if (!filePath || !fs_1.default.existsSync(filePath))
        return "";
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mime = ext === ".otf" ? "font/otf" : "font/ttf";
    return `data:${mime};base64,${fs_1.default.readFileSync(filePath).toString("base64")}`;
}
function escapePdfHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function toDate(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
function formatPdfDate(value) {
    const date = toDate(value);
    if (!date)
        return "-";
    return date.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
function daysBetween(a, b) {
    const startDate = toDate(a);
    const endDate = toDate(b);
    if (!startDate || !endDate)
        return null;
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
function percentage(part, total) {
    if (!total)
        return 0;
    return Math.round((part / total) * 100);
}
function normalizeDecision(value, t) {
    if (!value)
        return t.pending;
    if (value === "approved")
        return t.approved;
    if (value === "rejected")
        return t.rejected;
    if (value === "changes_requested")
        return t.changesRequested;
    return String(value).replace(/_/g, " ");
}
function isReportMedia(file) {
    const mimeType = String(file?.mimeType || "").toLowerCase();
    return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}
function qualityForReport(report, announcement, attendance) {
    if (!report?.submittedAt) {
        return { score: 0, label: "Not submitted" };
    }
    const attachments = report.attachments ?? [];
    const mediaCount = attachments.filter((attachment) => isReportMedia(attachment.file)).length;
    const bodyText = String(report.body || "").trim();
    const summaryText = String(report.summary || "").trim();
    const submittedAt = toDate(report.submittedAt);
    const deadline = toDate(announcement.deadline);
    const onTime = submittedAt && (!deadline || submittedAt <= deadline);
    let score = 0;
    if (String(report.title || "").trim())
        score += 10;
    if (summaryText.length >= 20)
        score += 15;
    if (bodyText.length >= 100)
        score += 25;
    if (attachments.length > 0)
        score += 15;
    if (mediaCount > 0)
        score += 10;
    if (onTime)
        score += 15;
    if (!announcement.attendanceRequired || attendance.completionRate >= 100)
        score += 10;
    let label = "Needs improvement";
    if (score >= 85)
        label = "Excellent";
    else if (score >= 65)
        label = "Good";
    else if (score >= 45)
        label = "Fair";
    return { score, label };
}
async function getAnnouncementsForFormalExport(announcementId) {
    return client_1.prisma.announcement.findMany({
        where: announcementId ? { id: announcementId } : {},
        include: {
            targets: {
                include: {
                    hibret: {
                        include: {
                            _count: {
                                select: {
                                    members: true,
                                    families: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
            },
            reports: {
                include: {
                    hibret: true,
                    attachments: {
                        include: {
                            file: true,
                        },
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                    reviews: {
                        orderBy: {
                            createdAt: "asc",
                        },
                    },
                },
                orderBy: {
                    submittedAt: "asc",
                },
            },
            attendanceRecords: {
                include: {
                    member: {
                        include: {
                            family: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
}
function buildAnnouncementMetrics(announcement, t) {
    const targets = announcement.targets ?? [];
    const reports = announcement.reports ?? [];
    const submittedReports = reports.filter((report) => Boolean(report.submittedAt));
    const reportByHibretId = new Map(reports.filter((report) => Boolean(report.submittedAt)).map((report) => [report.hibretId, report]));
    const attendanceRecords = announcement.attendanceRecords ?? [];
    let totalMembers = 0;
    let totalMarked = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let onTime = 0;
    let late = 0;
    const hibretRows = targets.map((target) => {
        const hibret = target.hibret;
        const report = reportByHibretId.get(target.hibretId);
        const records = attendanceRecords.filter((record) => record.hibretId === target.hibretId);
        const memberTotal = hibret?._count?.members ?? records.length;
        const familyTotal = hibret?._count?.families ?? 0;
        const present = records.filter((record) => record.status === "present").length;
        const absent = records.filter((record) => record.status === "absent").length;
        const excused = records.filter((record) => record.status === "excused").length;
        const marked = records.length;
        const unmarked = Math.max(memberTotal - marked, 0);
        const completionRate = percentage(marked, memberTotal);
        totalMembers += memberTotal;
        totalMarked += marked;
        totalPresent += present;
        totalAbsent += absent;
        totalExcused += excused;
        const submittedAt = report?.submittedAt ? toDate(report.submittedAt) : null;
        const deadline = toDate(announcement.deadline);
        const isOnTime = submittedAt && (!deadline || submittedAt <= deadline);
        if (submittedAt && isOnTime)
            onTime += 1;
        if (submittedAt && !isOnTime)
            late += 1;
        const dayDiff = submittedAt && deadline ? daysBetween(submittedAt, deadline) : null;
        const speed = !submittedAt
            ? "Not submitted"
            : !deadline
                ? "Submitted"
                : dayDiff === null
                    ? "Submitted"
                    : dayDiff >= 0
                        ? `${dayDiff} ${t.dayBeforeDeadline}`
                        : `${Math.abs(dayDiff)} ${t.dayLate}`;
        const quality = qualityForReport(report, announcement, { completionRate });
        return {
            hibretName: hibret?.name || "-",
            submitted: Boolean(submittedAt),
            submittedAt,
            review: normalizeDecision(report?.reviewDecision, t),
            memberTotal,
            familyTotal,
            marked,
            present,
            absent,
            excused,
            unmarked,
            completionRate,
            speed,
            quality,
            attachments: report?.attachments?.length ?? 0,
            media: report?.attachments?.filter((attachment) => isReportMedia(attachment.file)).length ?? 0,
        };
    });
    return {
        reportedRows: hibretRows.filter((row) => row.submitted),
        missingRows: hibretRows.filter((row) => !row.submitted),
        hibretRows,
        totals: {
            targeted: targets.length,
            submitted: submittedReports.length,
            missing: Math.max(targets.length - submittedReports.length, 0),
            totalMembers,
            totalMarked,
            totalPresent,
            totalAbsent,
            totalExcused,
            totalUnmarked: Math.max(totalMembers - totalMarked, 0),
            attendanceCompletionRate: percentage(totalMarked, totalMembers),
            onTime,
            late,
        },
    };
}
function statCard(label, value) {
    return `
    <div class="stat-card">
      <div class="stat-label">${escapePdfHtml(label)}</div>
      <div class="stat-value">${escapePdfHtml(value)}</div>
    </div>
  `;
}
function rowsHtml(rows, emptyColspan, t) {
    if (!rows.length) {
        return `<tr><td colspan="${emptyColspan}" class="empty-cell">${escapePdfHtml(t.noRecordsAvailable)}</td></tr>`;
    }
    return rows
        .map((row) => `
        <tr>
          ${row.map((cell) => `<td>${escapePdfHtml(cell)}</td>`).join("")}
        </tr>
      `)
        .join("");
}
function tableHtml(headers, rows, t) {
    return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapePdfHtml(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>${rowsHtml(rows, headers.length, t)}</tbody>
    </table>
  `;
}
function chartPercent(value, total) {
    if (!total)
        return 0;
    return Math.round((value / total) * 100);
}
function donutChartHtml(title, segments) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    let offset = 25;
    const rings = segments
        .map((segment) => {
        const percent = chartPercent(segment.value, total);
        const circle = `
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="transparent"
          stroke="${segment.color}"
          stroke-width="18"
          pathLength="100"
          stroke-dasharray="${percent} ${100 - percent}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 60 60)"
        />
      `;
        offset -= percent;
        return circle;
    })
        .join("");
    return `
    <div class="chart-card">
      <h3>${escapePdfHtml(title)}</h3>
      <div class="donut-layout">
        <svg class="donut-chart" viewBox="0 0 120 120" role="img" aria-label="${escapePdfHtml(title)}">
          <circle cx="60" cy="60" r="42" fill="transparent" stroke="#e6eaee" stroke-width="18" />
          ${rings}
          <circle cx="60" cy="60" r="25" fill="#ffffff" />
          <text x="60" y="56" text-anchor="middle" class="donut-total">${escapePdfHtml(String(total))}</text>
          <text x="60" y="72" text-anchor="middle" class="donut-caption">Total</text>
        </svg>

        <div class="chart-legend">
          ${segments
        .map((segment) => {
        const percent = chartPercent(segment.value, total);
        return `
                  <div class="legend-row">
                    <span class="legend-dot" style="background:${segment.color}"></span>
                    <span class="legend-label">${escapePdfHtml(segment.label)}</span>
                    <strong>${segment.value}</strong>
                    <em>${percent}%</em>
                  </div>
                `;
    })
        .join("")}
        </div>
      </div>
    </div>
  `;
}
function barChartHtml(title, rows, suffix = "") {
    const maxValue = Math.max(...rows.map((row) => row.value), 1);
    return `
    <div class="chart-card chart-card-wide">
      <h3>${escapePdfHtml(title)}</h3>
      <div class="bar-chart">
        ${rows
        .map((row) => {
        const width = Math.max(2, Math.round((row.value / maxValue) * 100));
        return `
                <div class="bar-row">
                  <div class="bar-label">${escapePdfHtml(row.label)}</div>
                  <div class="bar-track">
                    <div class="bar-fill" style="width:${width}%; background:${row.color};"></div>
                  </div>
                  <div class="bar-value">${escapePdfHtml(String(row.value))}${escapePdfHtml(suffix)}</div>
                </div>
              `;
    })
        .join("")}
      </div>
    </div>
  `;
}
function executiveChartsHtml(announcement, metrics, t) {
    const reviewCounts = metrics.hibretRows.reduce((acc, row) => {
        if (!row.submitted) {
            acc.pending += 1;
            return acc;
        }
        const value = String(row.review || "").toLowerCase();
        if (value.includes("approved") || value.includes("ጸድቋል") || value.includes("hayyamame")) {
            acc.approved += 1;
        }
        else if (value.includes("rejected") || value.includes("አላገኘም") || value.includes("dhiibame")) {
            acc.rejected += 1;
        }
        else if (value.includes("change") || value.includes("ለውጦች") || value.includes("jijjiiram")) {
            acc.changes += 1;
        }
        else {
            acc.pending += 1;
        }
        return acc;
    }, { approved: 0, rejected: 0, changes: 0, pending: 0 });
    const attendanceRequired = Boolean(announcement.attendanceRequired);
    const attendanceSegments = [
        { label: t.present, value: metrics.totals.totalPresent, color: "#0d6e4d" },
        { label: t.absent, value: metrics.totals.totalAbsent, color: "#ba1a1a" },
        { label: t.excused, value: metrics.totals.totalExcused, color: "#8a6d00" },
        { label: t.unmarked, value: metrics.totals.totalUnmarked, color: "#70787f" },
    ];
    const attendanceBars = metrics.hibretRows
        .slice()
        .sort((a, b) => b.completionRate - a.completionRate)
        .map((row) => ({
        label: row.hibretName,
        value: row.completionRate,
        color: row.completionRate >= 100 ? "#0d6e4d" : row.completionRate >= 60 ? "#00658d" : "#ba1a1a",
    }));
    const qualityBars = metrics.reportedRows
        .slice()
        .sort((a, b) => b.quality.score - a.quality.score)
        .map((row) => ({
        label: row.hibretName,
        value: row.quality.score,
        color: row.quality.score >= 85 ? "#0d6e4d" : row.quality.score >= 65 ? "#00658d" : "#8a6d00",
    }));
    return `
    <section class="executive-chart-section">
      <h2>Executive Report Progress</h2>
      <p class="chart-section-note">
        Report submission and Woreda review progress are shown separately for clear official review.
      </p>

      <div class="chart-grid-two">
        ${donutChartHtml("Report Submission", [
        { label: t.reported, value: metrics.totals.submitted, color: "#0d6e4d" },
        { label: t.missing, value: metrics.totals.missing, color: "#ba1a1a" },
    ])}

        ${donutChartHtml("Review Status", [
        { label: t.approved, value: reviewCounts.approved, color: "#0d6e4d" },
        { label: t.rejected, value: reviewCounts.rejected, color: "#ba1a1a" },
        { label: t.changesRequested, value: reviewCounts.changes, color: "#8a6d00" },
        { label: t.pending, value: reviewCounts.pending, color: "#70787f" },
    ])}
      </div>
    </section>

    ${attendanceRequired
        ? `
          <section class="executive-chart-section page-break-before">
            <h2>Attendance Analytics</h2>
            <p class="chart-section-note">
              Attendance distribution and completion are shown on their own page to avoid crowded charts.
            </p>

            <div class="chart-grid-one">
              ${donutChartHtml("Attendance Distribution", attendanceSegments)}
            </div>

            ${barChartHtml("Attendance Completion by Hibret", attendanceBars, "%")}
          </section>
        `
        : ""}

    ${qualityBars.length
        ? `
          <section class="executive-chart-section page-break-before">
            <h2>Submitted Report Quality</h2>
            <p class="chart-section-note">
              Quality score compares completeness, timeliness, attachments, media, and attendance completion.
            </p>

            ${barChartHtml("Submitted Report Quality Score by Hibret", qualityBars, "%")}
          </section>
        `
        : ""}
  `;
}
function reportDetailSectionHtml(report, announcement, t) {
    const attachments = report.attachments ?? [];
    const reviews = report.reviews ?? [];
    const attendanceRecords = (announcement.attendanceRecords ?? []).filter((record) => record.hibretId === report.hibretId);
    const present = attendanceRecords.filter((record) => record.status === "present").length;
    const absent = attendanceRecords.filter((record) => record.status === "absent").length;
    const excused = attendanceRecords.filter((record) => record.status === "excused").length;
    const marked = attendanceRecords.length;
    return `
    <section class="report-detail-block">
      <h2>${escapePdfHtml(t.submittedReportDetails)}</h2>
      <h3>${escapePdfHtml(report.hibret?.name || "-")} — ${escapePdfHtml(report.title || "-")}</h3>

      <div class="kv-grid">
        <div><span>${escapePdfHtml(t.hibret)}</span><strong>${escapePdfHtml(report.hibret?.name || "-")}</strong></div>
        <div><span>${escapePdfHtml(t.reportStatus)}</span><strong>${escapePdfHtml(report.status || "-")}</strong></div>
        <div><span>${escapePdfHtml(t.review)}</span><strong>${escapePdfHtml(normalizeDecision(report.reviewDecision, t))}</strong></div>
        <div><span>${escapePdfHtml(t.submittedAt)}</span><strong>${escapePdfHtml(formatPdfDate(report.submittedAt))}</strong></div>
        <div><span>${escapePdfHtml(t.attachments)}</span><strong>${attachments.length}</strong></div>
        <div><span>${escapePdfHtml(t.marked)}</span><strong>${marked}</strong></div>
      </div>

      <h3>${escapePdfHtml(t.summary)}</h3>
      <p class="instructions">${escapePdfHtml(report.summary || t.noSummaryProvided)}</p>

      <h3>${escapePdfHtml(t.reportBody)}</h3>
      <p class="instructions">${escapePdfHtml(report.body || "-")}</p>

      ${announcement.attendanceRequired
        ? `
            <h3>${escapePdfHtml(t.attendance)}</h3>
            <div class="stats-grid compact-stats">
              ${statCard(t.marked, marked)}
              ${statCard(t.present, present)}
              ${statCard(t.absent, absent)}
              ${statCard(t.excused, excused)}
            </div>
          `
        : ""}

      <h3>${escapePdfHtml(t.attachments)}</h3>
      ${tableHtml([t.fileName, t.fileType, t.fileSize], attachments.map((attachment) => [
        attachment.file?.originalName || "-",
        attachment.file?.mimeType || "-",
        String(attachment.file?.sizeBytes ?? "-"),
    ]), t)}

      <h3>${escapePdfHtml(t.reviewHistory)}</h3>
      ${tableHtml([t.review, t.comment, t.date], reviews.map((review) => [
        normalizeDecision(review.decision, t),
        review.comment || t.noCommentProvided,
        formatPdfDate(review.createdAt),
    ]), t)}
    </section>
  `;
}
function submittedReportsDetailHtml(announcement, t) {
    const reports = (announcement.reports ?? []).filter((report) => Boolean(report.submittedAt));
    if (!reports.length) {
        return `
      <section class="report-section">
        <h2>${escapePdfHtml(t.submittedReportDetails)}</h2>
        <p class="instructions">${escapePdfHtml(t.noSubmittedReports)}</p>
      </section>
    `;
    }
    return reports
        .map((report) => reportDetailSectionHtml(report, announcement, t))
        .join("");
}
function announcementSectionHtml(announcement, t, detailed = true) {
    const metrics = buildAnnouncementMetrics(announcement, t);
    return `
    <section class="report-section page-break-before">
      <h2>${escapePdfHtml(t.announcementDirectiveSummary)}</h2>
      <h3>${escapePdfHtml(announcement.title)}</h3>

      <div class="kv-grid">
        <div><span>${escapePdfHtml(t.title)}</span><strong>${escapePdfHtml(announcement.title)}</strong></div>
        <div><span>${escapePdfHtml(t.type)}</span><strong>${escapePdfHtml(announcement.type)}</strong></div>
        <div><span>${escapePdfHtml(t.deadline)}</span><strong>${escapePdfHtml(formatPdfDate(announcement.deadline))}</strong></div>
        <div><span>${escapePdfHtml(t.hibrets)}</span><strong>${metrics.totals.targeted}</strong></div>
      </div>

      <p class="instructions">${escapePdfHtml(announcement.instructions || "-")}</p>

      <div class="stats-grid">
        ${statCard(t.hibrets, metrics.totals.targeted)}
        ${statCard(t.reported, metrics.totals.submitted)}
        ${statCard(t.missing, metrics.totals.missing)}
        ${statCard(t.totalMembers, metrics.totals.totalMembers)}
        ${statCard(t.present, metrics.totals.totalPresent)}
        ${statCard(t.absent, metrics.totals.totalAbsent)}
        ${statCard(t.excused, metrics.totals.totalExcused)}
        ${statCard(t.unmarked, metrics.totals.totalUnmarked)}
        ${statCard(t.attendanceCompletion, `${metrics.totals.attendanceCompletionRate}%`)}
        ${statCard(t.onTimeReports, metrics.totals.onTime)}
        ${statCard(t.lateReports, metrics.totals.late)}
      </div>

      ${executiveChartsHtml(announcement, metrics, t)}

      <h2>${escapePdfHtml(t.reportedHibrets)}</h2>
      ${tableHtml([t.hibrets, t.families, t.members, t.submittedAt, t.review, t.speed], metrics.reportedRows.map((row) => [
        row.hibretName,
        String(row.familyTotal),
        String(row.memberTotal),
        formatPdfDate(row.submittedAt),
        row.review,
        row.speed,
    ]), t)}

      <h2>${escapePdfHtml(t.missingHibrets)}</h2>
      ${tableHtml([t.hibrets, t.families, t.members, t.report], metrics.missingRows.map((row) => [
        row.hibretName,
        String(row.familyTotal),
        String(row.memberTotal),
        t.notReported,
    ]), t)}

      ${detailed
        ? `
            <h2>${escapePdfHtml(t.attendanceByHibret)}</h2>
            ${tableHtml([t.hibrets, t.families, t.members, t.marked, t.present, t.absent, t.excused, t.unmarked, t.completion], metrics.hibretRows.map((row) => [
            row.hibretName,
            String(row.familyTotal),
            String(row.memberTotal),
            String(row.marked),
            String(row.present),
            String(row.absent),
            String(row.excused),
            String(row.unmarked),
            `${row.completionRate}%`,
        ]), t)}
          `
        : ""}
    </section>
  `;
}
function formalReportHtml(title, subtitle, body, t) {
    const logoDataUri = fileToDataUri(getPdfLogoPath());
    const fontDataUri = fontToDataUri(getPdfFontPath());
    const exportedAt = formatPdfDate(new Date());
    return `<!doctype html>
<html lang="am">
<head>
  <meta charset="utf-8" />
  <title>${escapePdfHtml(title)}</title>
  <style>
    ${fontDataUri
        ? `
          @font-face {
            font-family: "AstedaderEthiopic";
            src: url("${fontDataUri}") format("truetype");
            font-weight: 400 900;
            font-style: normal;
          }
        `
        : ""}

    @page {
      size: A4;
      margin: 16mm 14mm 18mm 14mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: #191c1d;
      font-family: "AstedaderEthiopic", "Noto Sans Ethiopic", "Noto Sans", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-header {
      display: grid;
      grid-template-columns: 64px 1fr 150px;
      gap: 14px;
      align-items: center;
      border-bottom: 2px solid #00658d;
      padding-bottom: 12px;
      margin-bottom: 22px;
    }

    .logo {
      width: 54px;
      height: 54px;
      object-fit: contain;
    }

    .brand-title {
      margin: 0;
      color: #004c6b;
      font-size: 22px;
      line-height: 1.15;
      font-weight: 900;
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      margin: 4px 0 0;
      color: #40484e;
      font-size: 12px;
      font-weight: 700;
    }

    .export-date {
      text-align: right;
      color: #70787f;
      font-size: 10px;
      font-weight: 700;
    }

    h1 {
      margin: 0 0 8px;
      color: #004c6b;
      font-size: 20px;
      line-height: 1.25;
      font-weight: 900;
    }

    h2 {
      margin: 24px 0 8px;
      color: #004c6b;
      font-size: 15px;
      line-height: 1.3;
      font-weight: 900;
      border-bottom: 1px solid #d7dee5;
      padding-bottom: 6px;
      page-break-after: avoid;
    }

    h3 {
      margin: 6px 0 12px;
      color: #191c1d;
      font-size: 14px;
      line-height: 1.35;
      font-weight: 900;
      page-break-after: avoid;
    }

    .intro {
      max-width: 680px;
      color: #40484e;
      font-size: 11.5px;
      font-weight: 600;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 12px 0 18px;
      page-break-inside: avoid;
    }

    .stat-card {
      border: 1px solid #d7dee5;
      background: #ffffff;
      padding: 10px;
      min-height: 58px;
    }

    .stat-card:nth-child(2) {
      border-left: 4px solid #fed000;
    }

    .stat-label {
      color: #70787f;
      font-size: 8.5px;
      line-height: 1.2;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stat-value {
      margin-top: 6px;
      color: #004c6b;
      font-size: 20px;
      line-height: 1.1;
      font-weight: 900;
    }

    .kv-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      border: 1px solid #d7dee5;
      margin: 10px 0 12px;
      page-break-inside: avoid;
    }

    .kv-grid div {
      border-right: 1px solid #d7dee5;
      border-bottom: 1px solid #d7dee5;
      padding: 8px 10px;
      min-height: 42px;
    }

    .kv-grid div:nth-child(2n) {
      border-right: 0;
    }

    .kv-grid span {
      display: block;
      color: #70787f;
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kv-grid strong {
      display: block;
      margin-top: 4px;
      color: #191c1d;
      font-size: 10.5px;
      font-weight: 800;
    }

    .instructions {
      border: 1px solid #d7dee5;
      background: #f8f9fa;
      padding: 10px;
      white-space: pre-wrap;
      color: #40484e;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 18px;
      table-layout: fixed;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #d7dee5;
      padding: 6px 7px;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
      word-break: normal;
    }

    th {
      background: #f2f4f7;
      color: #004c6b;
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    td {
      color: #191c1d;
      font-size: 9.2px;
      font-weight: 600;
    }

    .empty-cell {
      text-align: center;
      color: #70787f;
      font-style: italic;
      padding: 14px;
    }

    .page-break-before {
      break-before: page;
    }

    .page-break-before:first-child {
      break-before: auto;
    }

    .report-detail-block {
      break-before: page;
      page-break-before: always;
    }

    .compact-stats {
      grid-template-columns: repeat(4, 1fr);
      margin-top: 8px;
    }

    .report-detail-block h3 {
      margin-top: 14px;
    }

    .executive-charts {
      margin-top: 18px;
      page-break-inside: avoid;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0 16px;
      page-break-inside: avoid;
    }

    .chart-card {
      border: 1px solid #d7dee5;
      background: #ffffff;
      padding: 10px;
      min-height: 190px;
      page-break-inside: avoid;
    }

    .chart-card h3 {
      margin: 0 0 8px;
      color: #004c6b;
      font-size: 11px;
      font-weight: 900;
      border-bottom: 1px solid #eef2f5;
      padding-bottom: 5px;
    }

    .chart-card-wide {
      margin-top: 10px;
      min-height: auto;
    }

    .donut-layout {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 8px;
      align-items: center;
    }

    .donut-chart {
      width: 112px;
      height: 112px;
    }

    .donut-total {
      fill: #004c6b;
      font-size: 18px;
      font-weight: 900;
    }

    .donut-caption {
      fill: #70787f;
      font-size: 7px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .chart-legend {
      display: grid;
      gap: 5px;
    }

    .legend-row {
      display: grid;
      grid-template-columns: 9px 1fr auto auto;
      gap: 5px;
      align-items: center;
      color: #40484e;
      font-size: 8.5px;
      font-weight: 700;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      display: inline-block;
    }

    .legend-label {
      overflow-wrap: anywhere;
    }

    .legend-row strong {
      color: #191c1d;
      font-size: 9px;
    }

    .legend-row em {
      color: #70787f;
      font-style: normal;
      font-size: 8px;
    }

    .bar-chart {
      display: grid;
      gap: 7px;
      margin-top: 8px;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 170px 1fr 44px;
      gap: 8px;
      align-items: center;
      font-size: 8.5px;
      font-weight: 800;
    }

    .bar-label {
      color: #40484e;
      overflow-wrap: anywhere;
      line-height: 1.2;
    }

    .bar-track {
      height: 10px;
      background: #eef2f5;
      border: 1px solid #d7dee5;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
    }

    .bar-value {
      color: #004c6b;
      font-weight: 900;
      text-align: right;
    }


    /* Official executive chart layout overrides */
    .executive-chart-section {
      margin-top: 18px;
      page-break-inside: avoid;
    }

    .chart-section-note {
      margin: 0 0 12px;
      color: #40484e;
      font-size: 10.5px;
      font-weight: 700;
    }

    .chart-grid {
      display: block;
    }

    .chart-grid-two {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 12px 0 18px;
      page-break-inside: avoid;
    }

    .chart-grid-one {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      margin: 12px 0 18px;
      page-break-inside: avoid;
    }

    .chart-card {
      border: 1px solid #d7dee5;
      background: #ffffff;
      padding: 12px;
      min-height: 220px;
      page-break-inside: avoid;
    }

    .chart-grid-one .chart-card {
      min-height: 260px;
    }

    .chart-card h3 {
      margin: 0 0 10px;
      color: #004c6b;
      font-size: 12px;
      font-weight: 900;
      border-bottom: 1px solid #eef2f5;
      padding-bottom: 6px;
    }

    .chart-card-wide {
      margin-top: 12px;
      min-height: auto;
    }

    .donut-layout {
      display: grid;
      grid-template-columns: 132px minmax(0, 1fr);
      gap: 14px;
      align-items: center;
    }

    .chart-grid-one .donut-layout {
      grid-template-columns: 160px minmax(0, 1fr);
    }

    .donut-chart {
      width: 126px;
      height: 126px;
    }

    .chart-grid-one .donut-chart {
      width: 154px;
      height: 154px;
    }

    .legend-row {
      display: grid;
      grid-template-columns: 10px minmax(0, 1fr) 42px 44px;
      gap: 7px;
      align-items: center;
      color: #40484e;
      font-size: 9.2px;
      font-weight: 800;
      line-height: 1.25;
    }

    .legend-label {
      white-space: normal;
      overflow-wrap: normal;
      word-break: normal;
    }

    .legend-row strong,
    .legend-row em {
      text-align: right;
      white-space: nowrap;
    }

    .bar-row {
      display: grid;
      grid-template-columns: 210px 1fr 50px;
      gap: 8px;
      align-items: center;
      font-size: 8.8px;
      font-weight: 800;
    }

    .bar-track {
      height: 11px;
      background: #eef2f5;
      border: 1px solid #d7dee5;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
    }


    .footer-note {
      margin-top: 22px;
      color: #70787f;
      font-size: 9px;
      border-top: 1px solid #d7dee5;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <header class="report-header">
    <div>${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="Prosperity Party" />` : ""}</div>
    <div>
      <h1 class="brand-title">${escapePdfHtml(t.astedaderWoreda)}</h1>
      <p class="brand-subtitle">${escapePdfHtml(title)}</p>
      <p class="brand-subtitle">${escapePdfHtml(subtitle)}</p>
    </div>
    <div class="export-date">
      ${escapePdfHtml(t.prosperityParty)}<br />
      ${escapePdfHtml(t.exported)}<br />
      ${escapePdfHtml(exportedAt)}
    </div>
  </header>

  ${body}

  <p class="footer-note">${escapePdfHtml(t.footer)}</p>
</body>
</html>`;
}
async function htmlToPdfBuffer(html, t) {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, {
            waitUntil: ["load", "networkidle0"],
        });
        await page.emulateMediaType("print");
        return await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: true,
            headerTemplate: `<div></div>`,
            footerTemplate: `
        <div style="width:100%;font-size:8px;color:#70787f;padding:0 14mm;font-family:Arial,sans-serif;text-align:center;">
          ${escapePdfHtml(t.astedaderWoreda)} - ${escapePdfHtml(t.page)} <span class="pageNumber"></span> ${escapePdfHtml(t.of)} <span class="totalPages"></span>
        </div>
      `,
            margin: {
                top: "16mm",
                right: "14mm",
                bottom: "20mm",
                left: "14mm",
            },
        });
    }
    finally {
        await browser.close();
    }
}
function sendPdfBuffer(res, filename, buffer) {
    res.setHeader("Content-Type", "application/pdf");
    setAttachmentHeader(res, `${filename}.pdf`);
    return res.send(Buffer.from(buffer));
}
router.get("/announcements/export.pdf", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "announcement.export"))
        return;
    const t = (0, pdf_translations_1.getPdfTranslation)(req.query.lang);
    const lang = (0, pdf_translations_1.getPdfLang)(req.query.lang);
    const announcements = await getAnnouncementsForFormalExport();
    const aggregate = announcements.reduce((acc, announcement) => {
        const metrics = buildAnnouncementMetrics(announcement, t);
        acc.announcements += 1;
        acc.targeted += metrics.totals.targeted;
        acc.submitted += metrics.totals.submitted;
        acc.missing += metrics.totals.missing;
        acc.present += metrics.totals.totalPresent;
        acc.absent += metrics.totals.totalAbsent;
        acc.excused += metrics.totals.totalExcused;
        acc.unmarked += metrics.totals.totalUnmarked;
        acc.onTime += metrics.totals.onTime;
        acc.late += metrics.totals.late;
        return acc;
    }, {
        announcements: 0,
        targeted: 0,
        submitted: 0,
        missing: 0,
        present: 0,
        absent: 0,
        excused: 0,
        unmarked: 0,
        onTime: 0,
        late: 0,
    });
    const summaryRows = announcements.map((announcement) => {
        const metrics = buildAnnouncementMetrics(announcement, t);
        return [
            announcement.title,
            String(announcement.type),
            formatPdfDate(announcement.deadline),
            String(metrics.totals.targeted),
            String(metrics.totals.submitted),
            String(metrics.totals.missing),
        ];
    });
    const html = formalReportHtml(t.announcementPerformanceReport, t.announcementPerformanceSubtitle, `
      <section class="report-section">
        <h2>${escapePdfHtml(t.reportOverview)}</h2>
        <p class="intro">
          ${escapePdfHtml(t.reportOverviewText)}
        </p>

        <div class="stats-grid">
          ${statCard(t.announcements, aggregate.announcements)}
          ${statCard(t.hibrets, aggregate.targeted)}
          ${statCard(t.reported, aggregate.submitted)}
          ${statCard(t.missing, aggregate.missing)}
          ${statCard(t.present, aggregate.present)}
          ${statCard(t.absent, aggregate.absent)}
          ${statCard(t.excused, aggregate.excused)}
          ${statCard(t.unmarked, aggregate.unmarked)}
          ${statCard(t.onTime, aggregate.onTime)}
          ${statCard(t.late, aggregate.late)}
        </div>

        <h2>${escapePdfHtml(t.announcementsSummary)}</h2>
        ${tableHtml([t.announcement, t.type, t.deadline, t.hibrets, t.reported, t.missing], summaryRows, t)}
      </section>

      ${announcements.map((announcement) => announcementSectionHtml(announcement, t, true)).join("")}
    `, t);
    const pdf = await htmlToPdfBuffer(html, t);
    return sendPdfBuffer(res, `astedader-woreda-performance-report-${lang}`, pdf);
});
router.get("/announcements/:announcementId/reports.pdf", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "announcement.export"))
        return;
    const t = (0, pdf_translations_1.getPdfTranslation)(req.query.lang);
    const lang = (0, pdf_translations_1.getPdfLang)(req.query.lang);
    const announcements = await getAnnouncementsForFormalExport(String(req.params.announcementId));
    const announcement = announcements[0];
    if (!announcement) {
        return res.status(404).json({ message: "Directive not found" });
    }
    const html = formalReportHtml(t.directiveReportSummary, `${t.directive}: ${announcement.title}`, `
      ${announcementSectionHtml(announcement, t, true)}
      ${submittedReportsDetailHtml(announcement, t)}
    `, t);
    const pdf = await htmlToPdfBuffer(html, t);
    return sendPdfBuffer(res, `${announcement.title}-performance-report-${lang}`, pdf);
});
router.get("/woreda/announcements/:announcementId/hibrets/:hibretId/attendance.csv", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "attendance.export"))
        return;
    const context = await getAttendanceExportContext(String(req.params.announcementId), String(req.params.hibretId));
    if (!context) {
        return res.status(404).json({ message: "Attendance context not found" });
    }
    const csv = buildAttendanceExportCsv(context);
    const filename = `${safeName(context.announcement.title)}-${safeName(context.hibret.name)}-attendance.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    setAttachmentHeader(res, filename);
    return res.send(csv);
});
router.get("/woreda/announcements/:announcementId/hibrets/:hibretId/attendance.xlsx", auth_middleware_1.authMiddleware, async (req, res) => {
    if (!requireWoreda(req, res))
        return;
    if (!requireExportPrivilege(req, res, "attendance.export"))
        return;
    const context = await getAttendanceExportContext(String(req.params.announcementId), String(req.params.hibretId));
    if (!context) {
        return res.status(404).json({ message: "Attendance context not found" });
    }
    const buffer = await buildAttendanceWorkbookBuffer(context);
    const filename = `${safeName(context.announcement.title)}-${safeName(context.hibret.name)}-attendance.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    setAttachmentHeader(res, filename);
    return res.send(Buffer.from(buffer));
});
exports.default = router;
