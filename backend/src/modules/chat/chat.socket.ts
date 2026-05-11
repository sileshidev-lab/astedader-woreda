import type { Server } from "socket.io";
import { prisma } from "../../prisma/client";
import { verifyToken } from "../../utils/jwt";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function canUsePrivilege(privileges: string[] | undefined, privilege: string) {
  return Boolean(privileges?.includes("*") || privileges?.includes(privilege));
}

export function registerChatSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        String(socket.handshake.headers.authorization || "").replace(/^Bearer\s+/i, "");

      if (!token) return next(new Error("Unauthorized"));

      const payload = verifyToken(token);
      const userId = payload.userId;

      if (!userId) return next(new Error("Invalid token"));

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          hibretId: true,
          privileges: true,
          status: true,
        },
      });

      if (!user || user.status === "DISABLED") {
        return next(new Error("User disabled or not found"));
      }

      if (!canUsePrivilege(user.privileges, "chat.read")) {
        return next(new Error("Permission denied"));
      }

      socket.data.user = user;
      socket.join(`user:${normalizeEmail(user.email)}`);

      if (user.role === "WOREDA_ADMIN") socket.join("role:WOREDA_ADMIN");
      if (user.hibretId) socket.join(`hibret:${user.hibretId}`);

      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("chat:join", async (conversationId: string) => {
      const user = socket.data.user;
      if (!user || !conversationId) return;

      const conversation = await prisma.chatConversation.findUnique({
        where: { id: String(conversationId) },
      });

      if (!conversation) return;

      const allowed =
        user.role === "WOREDA_ADMIN" ||
        conversation.participantEmails.map(normalizeEmail).includes(normalizeEmail(user.email));

      if (!allowed) return;

      socket.join(`conversation:${conversation.id}`);
    });

    socket.on("chat:leave", (conversationId: string) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("chat:typing", (payload: { conversationId?: string; typing?: boolean }) => {
      const user = socket.data.user;
      if (!user || !payload?.conversationId) return;

      socket.to(`conversation:${payload.conversationId}`).emit("chat:typing", {
        conversationId: payload.conversationId,
        email: user.email,
        typing: Boolean(payload.typing),
      });
    });
  });
}
