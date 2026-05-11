"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const os_1 = require("os");
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const chat_routes_1 = __importDefault(require("./modules/chat/chat.routes"));
const chat_socket_1 = require("./modules/chat/chat.socket");
const httpServer = (0, http_1.createServer)(app_1.default);
function isAllowedSocketOrigin(origin) {
    if (!origin)
        return true;
    if (!env_1.env.IS_PRODUCTION)
        return true;
    return env_1.env.CORS_ORIGINS.includes(origin);
}
const io = new socket_io_1.Server(httpServer, {
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
app_1.default.set("io", io);
(0, chat_socket_1.registerChatSocket)(io);
// Chat routes are registered here because chat uses the Socket.IO server instance.
app_1.default.use("/chat", chat_routes_1.default);
function resolveLanIp() {
    const nets = (0, os_1.networkInterfaces)();
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
httpServer.listen(env_1.env.PORT, env_1.env.HOST, () => {
    const lanIp = resolveLanIp();
    console.log(`Backend running on http://localhost:${env_1.env.PORT}`);
    if (lanIp) {
        console.log(`Backend LAN URL: http://${lanIp}:${env_1.env.PORT}`);
    }
});
