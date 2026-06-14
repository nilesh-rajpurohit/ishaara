"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseWebRTCProps {
  sessionId: string;
  userId: string;
  language: string;
}

interface TranslationMessage {
  text: string;
  language: string;
  fromUserId: string;
  timestamp: string;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = ({ sessionId, userId, language }: UseWebRTCProps) => {
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<TranslationMessage[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<string[]>([]);

  const sendTranslation = useCallback((text: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit("translation-result", {
      sessionId,
      text,
      language,
      fromUserId: userId,
    });
  }, [sessionId, language, userId]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-session", { sessionId, userId, language });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("session-users", (users: { socketId: string }[]) => {
      setRemoteUsers(users.map((u) => u.socketId));
    });

    socket.on("user-joined", async ({ socketId }: { socketId: string }) => {
      setRemoteUsers((prev) => [...prev, socketId]);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            candidate: event.candidate,
            targetSocketId: socketId,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { sessionId, offer, targetSocketId: socketId });
    });

    socket.on("webrtc-offer", async ({ offer, fromSocketId }: any) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            candidate: event.candidate,
            targetSocketId: fromSocketId,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { answer, targetSocketId: fromSocketId });
    });

    socket.on("webrtc-answer", async ({ answer }: any) => {
      await peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    socket.on("webrtc-ice-candidate", async ({ candidate }: any) => {
      await peerConnectionRef.current?.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    });

    socket.on("translation-received", (message: TranslationMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("user-left", ({ socketId }: { socketId: string }) => {
      setRemoteUsers((prev) => prev.filter((id) => id !== socketId));
    });

    return () => {
      socket.emit("leave-session", { sessionId, userId });
      socket.disconnect();
      peerConnectionRef.current?.close();
    };
  }, [sessionId, userId, language]);

  return { isConnected, messages, remoteUsers, sendTranslation };
};
