// backend/src/controllers/socketManager.js
import { Server } from "socket.io";

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // roomId -> Set<socketId>
  const roomSockets = new Map();
  // socketId -> { roomId, name }
  const socketInfo = new Map();

  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // -------------------------------------------------
    // JOIN CALL
    // -------------------------------------------------
    socket.on("join-call", (roomId, name) => {
      if (!roomId) return;

      const displayName = name || "Guest";
      socketInfo.set(socket.id, { roomId, name: displayName });

      if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
      roomSockets.get(roomId).add(socket.id);

      socket.join(roomId);

      const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

      console.log(
        `👤 ${displayName} joined ${roomId} | Users: ${clients.length}`
      );

      // Notify others
      socket.to(roomId).emit("user-joined", socket.id, clients, displayName);

      // Also tell the new user
      socket.emit("user-joined", socket.id, clients, displayName);
    });

    // -------------------------------------------------
    // WEBRTC SIGNAL
    // -------------------------------------------------
    socket.on("signal", (toId, message, senderName) => {
      if (!toId) return;
      io.to(toId).emit("signal", socket.id, message, senderName);
    });

    // -------------------------------------------------
    // CHAT MESSAGE – (FIXED: no double messages)
    // -------------------------------------------------
    socket.on("chat-message", (message, sender, senderSocketId) => {
      const info = socketInfo.get(socket.id);
      if (!info) return;

      const { roomId } = info;

      const msgData = {
        sender,
        data: message,
        timestamp: new Date().toLocaleTimeString(),
        socketId: senderSocketId,
      };

      console.log(`💬 [${roomId}] ${sender}: ${message}`);

      // Send to everyone **including sender**
      io.to(roomId).emit("chat-message", msgData);
    });

    // -------------------------------------------------
    // DISCONNECT
    // -------------------------------------------------
    socket.on("disconnect", () => {
      const info = socketInfo.get(socket.id);

      if (!info) {
        console.log("❌ Disconnected without room:", socket.id);
        return;
      }

      const { roomId, name } = info;
      socketInfo.delete(socket.id);

      if (roomSockets.has(roomId)) {
        const set = roomSockets.get(roomId);
        set.delete(socket.id);

        if (set.size === 0) {
          roomSockets.delete(roomId);
          console.log(`🗑️ Room deleted: ${roomId}`);
        } else {
          socket.to(roomId).emit("user-left", socket.id);
          console.log(`👋 ${name} left | Remaining: ${set.size}`);
        }
      }
    });
  });

  console.log("✅ Socket.IO initialized");
};
