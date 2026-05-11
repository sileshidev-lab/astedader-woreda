import { io, type Socket } from "socket.io-client";
import { AUTH_TOKEN_KEY } from "./apiClient";
import { getApiBaseUrl } from "./runtimeConfig";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function getSocketUrl() {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api$/, "").replace(/\/$/, "");
}

let socket: Socket | null = null;
let connectionCount = 0;

function createSocket(): Socket {
  const newSocket = io(getSocketUrl(), {
    autoConnect: false,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    auth: { token: getToken() },
  });

  newSocket.on("connect_error", (err) => {
    console.warn("[chatSocket] connect error:", err.message);
  });

  return newSocket;
}

export function getChatSocket(): Socket {
  const token = getToken();

  if (!socket) {
    socket = createSocket();
  }

  // Refresh auth token on the existing socket reference
  // (effective on next reconnection; active connections need reconnect to pick it up)
  socket.auth = { token };

  return socket;
}

export function ensureChatSocket(): Socket {
  const s = getChatSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function connectChatSocket() {
  connectionCount++;
  const s = ensureChatSocket();
  return s;
}

export function disconnectChatSocket() {
  connectionCount = Math.max(0, connectionCount - 1);
  if (connectionCount === 0 && socket) {
    socket.disconnect();
  }
}

export function teardownChatSocket() {
  connectionCount = 0;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
