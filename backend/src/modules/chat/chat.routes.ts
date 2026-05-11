import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../../prisma/client";
import { authMiddleware } from "../../middleware/auth.middleware";
import { requirePrivilege } from "../../middleware/requirePrivilege";

const router = Router();

const uploadDir = path.resolve(process.cwd(), "../uploads/chat");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const safeOriginal = file.originalname.replace(/[^\p{L}\p{N}. _-]/gu, "_");
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 8,
  },
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getUserEmail(req: any) {
  return normalizeEmail(req.user?.email || "");
}

function getUserId(req: any) {
  return req.user?.id || null;
}

function canAccessConversation(req: any, conversation: { participantEmails: string[] }) {
  if (req.user?.role === "WOREDA_ADMIN") return true;

  const email = getUserEmail(req);
  return conversation.participantEmails.map(normalizeEmail).includes(email);
}

function decodeUploadedFilename(name: string) {
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    if (decoded.includes("�")) return name;
    return decoded;
  } catch {
    return name;
  }
}

function safeAsciiFilename(name?: string | null) {
  const fallback = "file";
  if (!name) return fallback;

  const cleaned = name
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim();

  return cleaned || fallback;
}

function encodedUtf8Filename(name?: string | null) {
  const fallback = "file";
  return encodeURIComponent(name || fallback)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}

function contentDispositionValue(disposition: "inline" | "attachment", originalName?: string | null) {
  const asciiName = safeAsciiFilename(originalName);
  const utf8Name = encodedUtf8Filename(originalName);
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}

function messageInclude() {
  return {
    attachments: {
      orderBy: { createdAt: "asc" as const },
    },
  };
}

router.get(
  "/conversations",
  authMiddleware,
  requirePrivilege("chat.read"),
  async (req: any, res) => {
    const email = getUserEmail(req);

    const where =
      req.user?.role === "WOREDA_ADMIN"
        ? {}
        : { participantEmails: { has: email } };

    const conversations = await prisma.chatConversation.findMany({
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
  }
);

router.post(
  "/conversations",
  authMiddleware,
  requirePrivilege("chat.send"),
  upload.array("files", 8),
  async (req: any, res) => {
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

    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
      select: { id: true, email: true, status: true },
    });

    if (!recipient || recipient.status === "DISABLED") {
      return res.status(404).json({ message: "Recipient account not found or inactive." });
    }

    const participantEmails = Array.from(new Set([senderEmail, recipientEmail].filter(Boolean)));
    const files = (req.files || []) as Express.Multer.File[];

    const conversation = await prisma.chatConversation.create({
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
  }
);

router.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  requirePrivilege("chat.read"),
  async (req: any, res) => {
    const conversation = await prisma.chatConversation.findUnique({
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
  }
);

router.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  requirePrivilege("chat.send"),
  upload.array("files", 8),
  async (req: any, res) => {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: String(req.params.conversationId) },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found." });
    }

    if (!canAccessConversation(req, conversation)) {
      return res.status(403).json({ message: "You cannot access this conversation." });
    }

    const body = String(req.body?.body || "").trim();
    const files = (req.files || []) as Express.Multer.File[];

    if (!body && files.length === 0) {
      return res.status(400).json({ message: "Message or file is required." });
    }

    const message = await prisma.chatMessage.create({
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

    const updatedConversation = await prisma.chatConversation.update({
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
  }
);

router.get(
  "/attachments/:attachmentId/download",
  authMiddleware,
  requirePrivilege("chat.read"),
  async (req: any, res) => {
    const attachment = await prisma.chatAttachment.findUnique({
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

    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({ message: "File not found on disk." });
    }

    const inline = String(req.query.inline || "") === "true";

    res.setHeader("Content-Type", attachment.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      contentDispositionValue(inline ? "inline" : "attachment", attachment.originalName)
    );

    return res.sendFile(path.resolve(attachment.path));
  }
);

export default router;
