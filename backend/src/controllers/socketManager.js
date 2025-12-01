// backend/src/controllers/socketManager.js
import { Server } from "socket.io";

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://meetup-frontend.vercel.app",
        /\.vercel\.app$/,
      ],
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

      // Notify others in the room
      socket.to(roomId).emit("user-joined", socket.id, displayName, clients);

      // Notify the new user
      socket.emit("user-joined", socket.id, displayName, clients);
    });

    // -------------------------------------------------
    // WEBRTC SIGNAL
    // -------------------------------------------------
    socket.on("signal", (toId, message, senderName) => {
      if (!toId) return;
      io.to(toId).emit("signal", socket.id, message, senderName);
    });

    // -------------------------------------------------
    // CHAT MESSAGE - FIXED: Send string message, not object
    // -------------------------------------------------
    socket.on("chat-message", (messageText, sender, senderSocketId) => {
      const info = socketInfo.get(socket.id);
      if (!info) return;

      const { roomId } = info;

      // Ensure messageText is a string
      const cleanMessage = typeof messageText === "string" ? messageText : String(messageText || "");

      console.log(`💬 [${roomId}] ${sender}: ${cleanMessage}`);

      // IMPORTANT: Emit as separate parameters matching frontend expectation
      // Parameters: (messageString, senderName, senderId)
      io.to(roomId).emit("chat-message", cleanMessage, sender, senderSocketId);
    });

    // -------------------------------------------------
    // LEAVE CALL
    // -------------------------------------------------
    socket.on("leave-call", (roomId) => {
      const info = socketInfo.get(socket.id);
      if (info) {
        socket.to(roomId).emit("user-left", socket.id);
      }
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