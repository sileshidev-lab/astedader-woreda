"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const upload_1 = require("./upload");
const jwt_1 = require("../../utils/jwt");
function safeAsciiFilename(name) {
    const fallback = "file";
    if (!name)
        return fallback;
    const cleaned = name
        .replace(/[\r\n"]/g, "")
        .replace(/[^\x20-\x7E]/g, "_")
        .trim();
    return cleaned || fallback;
}
function encodedUtf8Filename(name) {
    const fallback = "file";
    return encodeURIComponent(name || fallback)
        .replace(/['()]/g, escape)
        .replace(/\*/g, "%2A");
}
function contentDispositionValue(disposition, originalName) {
    const asciiName = safeAsciiFilename(originalName);
    const utf8Name = encodedUtf8Filename(originalName);
    return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}
const router = (0, express_1.Router)();
function decodeUploadedFilename(name) {
    try {
        const decoded = Buffer.from(name, "latin1").toString("utf8");
        // If decoding produced replacement characters, keep original.
        if (decoded.includes("�"))
            return name;
        return decoded;
    }
    catch {
        return name;
    }
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
function getTokenFromRequest(req) {
    const header = req.headers.authorization;
    const headerToken = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
    return headerToken || queryToken;
}
function resolveStoredFilePath(storedPath) {
    if (path_1.default.isAbsolute(storedPath))
        return storedPath;
    const candidates = [
        path_1.default.resolve(process.cwd(), storedPath),
        path_1.default.resolve(process.cwd(), "backend", storedPath),
        path_1.default.resolve(__dirname, "../../../", storedPath),
        path_1.default.resolve(__dirname, "../../../../", storedPath),
    ];
    return candidates.find((candidate) => fs_1.default.existsSync(candidate)) || path_1.default.resolve(process.cwd(), storedPath);
}
function verifyRequestToken(req, res) {
    const token = getTokenFromRequest(req);
    if (!token) {
        res.status(401).json({ message: "Authentication required" });
        return false;
    }
    try {
        (0, jwt_1.verifyToken)(token);
        return true;
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
        return false;
    }
}
router.post("/upload/announcement", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("announcement.create"), upload_1.announcementUpload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File is required" });
    }
    const record = await client_1.prisma.fileRecord.create({
        data: {
            originalName: decodeUploadedFilename(req.file.originalname),
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            path: req.file.path,
            category: "announcement",
            uploadedById: req.user?.id,
        },
    });
    return res.status(201).json({ file: record });
});
router.post("/upload/broadcast", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("broadcast.create"), upload_1.broadcastUpload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File is required" });
    }
    const record = await client_1.prisma.fileRecord.create({
        data: {
            originalName: decodeUploadedFilename(req.file.originalname),
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            path: req.file.path,
            category: "broadcast",
            uploadedById: req.user?.id,
        },
    });
    return res.status(201).json({ file: record });
});
router.post("/upload/resource", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("resource.create"), upload_1.resourceUpload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File is required" });
    }
    const record = await client_1.prisma.fileRecord.create({
        data: {
            originalName: decodeUploadedFilename(req.file.originalname),
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            path: req.file.path,
            category: "resource",
            uploadedById: req.user?.id,
        },
    });
    return res.status(201).json({ file: record });
});
router.post("/upload/report", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("media.upload"), upload_1.reportUpload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File is required" });
    }
    const record = await client_1.prisma.fileRecord.create({
        data: {
            originalName: decodeUploadedFilename(req.file.originalname),
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            path: req.file.path,
            category: "report",
            uploadedById: req.user?.id,
        },
    });
    return res.status(201).json({ file: record });
});
router.post("/upload/member", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("member.update"), upload_1.memberPhotoUpload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "File is required." });
    }
    if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Member photo must be an image file." });
    }
    const file = await client_1.prisma.fileRecord.create({
        data: {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            path: req.file.path,
            category: "member",
            uploadedById: req.user?.id,
        },
    });
    return res.status(201).json({ file });
});
router.get("/:fileId/preview", async (req, res) => {
    if (!verifyRequestToken(req, res))
        return;
    const file = await client_1.prisma.fileRecord.findUnique({
        where: { id: String(req.params.fileId) },
    });
    if (!file) {
        return res.status(404).send("File not found");
    }
    const absolutePath = resolveStoredFilePath(file.path);
    const baseToken = typeof req.query.token === "string" ? req.query.token : "";
    const inlineUrl = `/files/${file.id}/download?inline=true&token=${encodeURIComponent(baseToken)}`;
    const downloadUrl = `/files/${file.id}/download?token=${encodeURIComponent(baseToken)}`;
    const name = escapeHtml(file.originalName);
    const mime = escapeHtml(file.mimeType || "application/octet-stream");
    let body = "";
    if (file.mimeType.startsWith("image/")) {
        body = `<img src="${inlineUrl}" alt="${name}" class="image" />`;
    }
    else if (file.mimeType === "application/pdf") {
        body = `<iframe src="${inlineUrl}" title="${name}"></iframe>`;
    }
    else if (file.mimeType.startsWith("text/") ||
        file.originalName.endsWith(".md") ||
        file.originalName.endsWith(".txt") ||
        file.originalName.endsWith(".csv") ||
        file.originalName.endsWith(".json")) {
        let content = "";
        try {
            content = fs_1.default.readFileSync(absolutePath, "utf8");
        }
        catch {
            content = "Unable to read text preview.";
        }
        body = `<pre>${escapeHtml(content)}</pre>`;
    }
    else {
        body = `
      <div class="unsupported">
        <h2>Preview is not available for this file type</h2>
        <p>This file type may require downloading and opening with a desktop application.</p>
        <p><strong>File type:</strong> ${mime}</p>
        <a class="button" href="${downloadUrl}">Download file</a>
      </div>
    `;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${name}</title>
  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #F8F9FA;
      color: #191C1D;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid #BFC7CF;
      background: #ffffff;
      padding: 14px 18px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .title {
      min-width: 0;
    }
    h1 {
      margin: 0;
      font-size: 16px;
      word-break: break-word;
    }
    .mime {
      margin-top: 4px;
      font-size: 12px;
      color: #70787F;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .button {
      display: inline-flex;
      align-items: center;
      border: 1px solid #BFC7CF;
      background: #ffffff;
      color: #00658D;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
    main {
      padding: 18px;
    }
    .image {
      display: block;
      max-width: 100%;
      max-height: calc(100vh - 110px);
      margin: 0 auto;
      object-fit: contain;
      border: 1px solid #BFC7CF;
      background: #000;
    }
    iframe {
      width: 100%;
      height: calc(100vh - 100px);
      border: 1px solid #BFC7CF;
      background: #ffffff;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid #BFC7CF;
      background: #ffffff;
      padding: 16px;
      line-height: 1.6;
      overflow: auto;
    }
    .unsupported {
      max-width: 720px;
      margin: 48px auto;
      border: 1px solid #BFC7CF;
      background: #ffffff;
      padding: 24px;
    }
  </style>
</head>
<body>
  <header>
    <div class="title">
      <h1>${name}</h1>
      <div class="mime">${mime}</div>
    </div>
    <div class="actions">
      <a class="button" href="${downloadUrl}">Download</a>
    </div>
  </header>
  <main>${body}</main>
</body>
</html>`);
});
router.get("/:fileId/download", async (req, res) => {
    if (!verifyRequestToken(req, res))
        return;
    const file = await client_1.prisma.fileRecord.findUnique({
        where: { id: String(req.params.fileId) },
    });
    if (!file) {
        return res.status(404).json({ message: "File not found" });
    }
    const absolutePath = resolveStoredFilePath(file.path);
    const inline = req.query.inline === "true";
    if (inline) {
        res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Content-Disposition", contentDispositionValue("inline", file.originalName));
        return res.sendFile(absolutePath);
    }
    return res.download(absolutePath, file.originalName);
});
exports.default = router;
