import { Server } from "socket.io";
import type { HttpServer } from "http";
import { translationSocket } from "./translation.socket";

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  translationSocket(io);

  io.on("connection", (socket) => {
    console.info(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      console.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
