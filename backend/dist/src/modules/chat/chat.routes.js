"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("../../prisma/client");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const requirePrivilege_1 = require("../../middleware/requirePrivilege");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.resolve(process.cwd(), "../uploads/chat");
fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
        const safeOriginal = file.originalname.replace(/[^\p{L}\p{N}. _-]/gu, "_");
        callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 8,
    },
});
function normalizeEmail(value) {
    return value.trim().toLowerCase();
}
function getUserEmail(req) {
    return normalizeEmail(req.user?.email || "");
}
function getUserId(req) {
    return req.user?.id || null;
}
function canAccessConversation(req, conversation) {
    if (req.user?.role === "WOREDA_ADMIN")
        return true;
    const email = getUserEmail(req);
    return conversation.participantEmails.map(normalizeEmail).includes(email);
}
function decodeUploadedFilename(name) {
    try {
        const decoded = Buffer.from(name, "latin1").toString("utf8");
        if (decoded.includes("�"))
            return name;
        return decoded;
    }
    catch {
        return name;
    }
}
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
function messageInclude() {
    return {
        attachments: {
            orderBy: { createdAt: "asc" },
        },
    };
}
router.get("/conversations", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("chat.read"), async (req, res) => {
    const email = getUserEmail(req);
    const where = req.user?.role === "WOREDA_ADMIN"
        ? {}
        : { participantEmails: { has: email } };
    const conversations = await client_1.prisma.chatConversation.findMany({
        where,
        include: {
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: messageInclude(),
            },
        },
        orderBy: { updatedAt: "desc" },
    });
    return res.json({ conversations });
});
router.post("/conversations", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("chat.send"), upload.array("files", 8), async (req, res) => {
    const senderEmail = getUserEmail(req);
    const recipientEmail = normalizeEmail(String(req.body?.recipientEmail || ""));
    const subject = String(req.body?.subject || "New conversation").trim();
    const body = String(req.body?.message || "").trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
        return res.status(400).json({ message: "Enter a valid email address." });
    }
    if (senderEmail && recipientEmail === senderEmail) {
        return res.status(400).json({ message: "Choose a different recipient." });
    }
    if (!body && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ message: "Message or file is required." });
    }
    const recipient = await client_1.prisma.user.findUnique({
        where: { email: recipientEmail },
        select: { id: true, email: true, status: true },
    });
    if (!recipient || recipient.status === "DISABLED") {
        return res.status(404).json({ message: "Recipient account not found or inactive." });
    }
    const participantEmails = Array.from(new Set([senderEmail, recipientEmail].filter(Boolean)));
    const files = (req.files || []);
    const conversation = await client_1.prisma.chatConversation.create({
        data: {
            subject: subject || "New conversation",
            participantEmails,
            createdByUserId: getUserId(req),
            createdByEmail: senderEmail,
            messages: {
                create: {
                    senderUserId: getUserId(req),
                    senderEmail,
                    body,
                    attachments: {
                        create: files.map((file) => ({
                            originalName: decodeUploadedFilename(file.originalname),
                            storedName: file.filename,
                            mimeType: file.mimetype || "application/octet-stream",
                            sizeBytes: file.size,
                            path: file.path,
                        })),
                    },
                },
            },
        },
        include: {
            messages: {
                orderBy: { createdAt: "asc" },
                include: messageInclude(),
            },
        },
    });
    const firstMessage = conversation.messages[0];
    const io = req.app.get("io");
    if (io) {
        for (const email of participantEmails) {
            io.to(`user:${normalizeEmail(email)}`).emit("chat:conversation:new", conversation);
        }
        io.to(`conversation:${conversation.id}`).emit("chat:message:new", firstMessage);
    }
    return res.status(201).json({ conversation });
});
router.get("/conversations/:conversationId/messages", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("chat.read"), async (req, res) => {
    const conversation = await client_1.prisma.chatConversation.findUnique({
        where: { id: String(req.params.conversationId) },
        include: {
            messages: {
                orderBy: { createdAt: "asc" },
                include: messageInclude(),
            },
        },
    });
    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
    }
    if (!canAccessConversation(req, conversation)) {
        return res.status(403).json({ message: "You cannot access this conversation." });
    }
    return res.json({ conversation, messages: conversation.messages });
});
router.post("/conversations/:conversationId/messages", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("chat.send"), upload.array("files", 8), async (req, res) => {
    const conversation = await client_1.prisma.chatConversation.findUnique({
        where: { id: String(req.params.conversationId) },
    });
    if (!conversation) {
        return res.status(404).json({ message: "Conversation not found." });
    }
    if (!canAccessConversation(req, conversation)) {
        return res.status(403).json({ message: "You cannot access this conversation." });
    }
    const body = String(req.body?.body || "").trim();
    const files = (req.files || []);
    if (!body && files.length === 0) {
        return res.status(400).json({ message: "Message or file is required." });
    }
    const message = await client_1.prisma.chatMessage.create({
        data: {
            conversationId: conversation.id,
            senderUserId: getUserId(req),
            senderEmail: getUserEmail(req),
            body,
            attachments: {
                create: files.map((file) => ({
                    originalName: decodeUploadedFilename(file.originalname),
                    storedName: file.filename,
                    mimeType: file.mimetype || "application/octet-stream",
                    sizeBytes: file.size,
                    path: file.path,
                })),
            },
        },
        include: messageInclude(),
    });
    const updatedConversation = await client_1.prisma.chatConversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
        include: {
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: messageInclude(),
            },
        },
    });
    const io = req.app.get("io");
    if (io) {
        io.to(`conversation:${conversation.id}`).emit("chat:message:new", message);
        for (const email of conversation.participantEmails) {
            io.to(`user:${normalizeEmail(email)}`).emit("chat:conversation:update", updatedConversation);
        }
    }
    return res.status(201).json({ message });
});
router.get("/attachments/:attachmentId/download", auth_middleware_1.authMiddleware, (0, requirePrivilege_1.requirePrivilege)("chat.read"), async (req, res) => {
    const attachment = await client_1.prisma.chatAttachment.findUnique({
        where: { id: String(req.params.attachmentId) },
        include: {
            message: {
                include: {
                    conversation: true,
                },
            },
        },
    });
    if (!attachment) {
        return res.status(404).json({ message: "Attachment not found." });
    }
    if (!canAccessConversation(req, attachment.message.conversation)) {
        return res.status(403).json({ message: "You cannot access this attachment." });
    }
    if (!fs_1.default.existsSync(attachment.path)) {
        return res.status(404).json({ message: "File not found on disk." });
    }
    const inline = String(req.query.inline || "") === "true";
    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", contentDispositionValue(inline ? "inline" : "attachment", attachment.originalName));
    return res.sendFile(path_1.default.resolve(attachment.path));
});
exports.default = router;
