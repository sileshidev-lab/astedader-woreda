import { createServer } from "http";
import { networkInterfaces } from "os";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { env } from "./config/env";
import chatRoutes from "./modules/chat/chat.routes";
import { registerChatSocket } from "./modules/chat/chat.socket";

const httpServer = createServer(app);

function isAllowedSocketOrigin(origin?: string) {
  if (!origin) return true;
  if (!env.IS_PRODUCTION) return true;
  return env.CORS_ORIGINS.includes(origin);
}

const io = new SocketIOServer(httpServer, {
  cors: {
    origin(origin, callback) {
      if (isAllowedSocketOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Socket.IO CORS blocked origin: ${origin}`));
    },
    credentials: true,
  },
});

app.set("io", io);
registerChatSocket(io);

// Chat routes are registered here because chat uses the Socket.IO server instance.
app.use("/chat", chatRoutes);

function resolveLanIp() {
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    const addresses = nets[name] || [];

    for (const addr of addresses) {
      if (addr.family === "IPv4" && !addr.internal) {
        return addr.address;
      }
    }
  }

  return null;
}

httpServer.listen(env.PORT, env.HOST, () => {
  const lanIp = resolveLanIp();

  console.log(`Backend running on http://localhost:${env.PORT}`);

  if (lanIp) {
    console.log(`Backend LAN URL: http://${lanIp}:${env.PORT}`);
  }
});
