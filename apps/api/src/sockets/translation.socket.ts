import type { Server, Socket } from "socket.io";

interface SessionUser {
  socketId: string;
  userId: string;
  language: string;
}

const sessions = new Map<string, SessionUser[]>();

export const translationSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {

    socket.on("join-session", ({ sessionId, userId, language }) => {
      socket.join(sessionId);

      const users = sessions.get(sessionId) || [];
      users.push({ socketId: socket.id, userId, language });
      sessions.set(sessionId, users);

      socket.to(sessionId).emit("user-joined", {
        socketId: socket.id,
        userId,
        language,
      });

      const otherUsers = users.filter((u) => u.socketId !== socket.id);
      socket.emit("session-users", otherUsers);

      console.info(`User ${userId} joined session ${sessionId}`);
    });

    socket.on("webrtc-offer", ({ sessionId, offer, targetSocketId }) => {
      socket.to(targetSocketId).emit("webrtc-offer", {
        offer,
        fromSocketId: socket.id,
      });
    });

    socket.on("webrtc-answer", ({ answer, targetSocketId }) => {
      socket.to(targetSocketId).emit("webrtc-answer", {
        answer,
        fromSocketId: socket.id,
      });
    });

    socket.on("webrtc-ice-candidate", ({ candidate, targetSocketId }) => {
      socket.to(targetSocketId).emit("webrtc-ice-candidate", {
        candidate,
        fromSocketId: socket.id,
      });
    });

    socket.on("translation-result", ({ sessionId, text, language, fromUserId }) => {
      socket.to(sessionId).emit("translation-received", {
        text,
        language,
        fromUserId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("leave-session", ({ sessionId, userId }) => {
      socket.leave(sessionId);
      const users = sessions.get(sessionId) || [];
      const updated = users.filter((u) => u.socketId !== socket.id);
      if (updated.length === 0) {
        sessions.delete(sessionId);
      } else {
        sessions.set(sessionId, updated);
      }
      socket.to(sessionId).emit("user-left", { socketId: socket.id, userId });
    });

    socket.on("disconnect", () => {
      sessions.forEach((users, sessionId) => {
        const updated = users.filter((u) => u.socketId !== socket.id);
        if (updated.length === 0) {
          sessions.delete(sessionId);
        } else {
          sessions.set(sessionId, updated);
          socket.to(sessionId).emit("user-left", { socketId: socket.id });
        }
      });
    });
  });
};
