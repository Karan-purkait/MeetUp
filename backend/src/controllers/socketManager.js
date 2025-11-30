// backend/src/controllers/socketManager.js
import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // or ['http://localhost:3000'] when you know the frontend URL
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-call", (roomId) => {
      if (!roomId) return;

      if (!connections[roomId]) {
        connections[roomId] = [];
      }
      connections[roomId].push(socket.id);

      timeOnline[socket.id] = new Date();

      // notify existing users in the room
      connections[roomId].forEach((clientId) => {
        io.to(clientId).emit("user-joined", socket.id, connections[roomId]);
      });

      // send existing messages to the new user
      if (messages[roomId]) {
        messages[roomId].forEach((msg) => {
          io.to(socket.id).emit(
            "chat-message",
            msg.data,
            msg.sender,
            msg["socket-id-sender"]
          );
        });
      }
    });

    socket.on("signal", (toId, message) => {
      if (!toId) return;
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      // find room containing this socket
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false]
      );

      if (!found) return;

      if (!messages[matchingRoom]) {
        messages[matchingRoom] = [];
      }

      messages[matchingRoom].push({
        sender,
        data,
        "socket-id-sender": socket.id,
      });

      connections[matchingRoom].forEach((clientId) => {
        io.to(clientId).emit("chat-message", data, sender, socket.id);
      });
    });

    socket.on("disconnect", () => {
      const startTime = timeOnline[socket.id];
      if (startTime) {
        const diffTime = Math.abs(startTime - new Date());
        console.log(`Socket ${socket.id} online for ${diffTime} ms`);
        delete timeOnline[socket.id];
      }

      // remove from any room and notify others
      for (const [roomId, clientIds] of Object.entries(connections)) {
        if (clientIds.includes(socket.id)) {
          clientIds.forEach((clientId) => {
            io.to(clientId).emit("user-left", socket.id);
          });

          connections[roomId] = clientIds.filter(
            (clientId) => clientId !== socket.id
          );

          if (connections[roomId].length === 0) {
            delete connections[roomId];
          }
        }
      }
    });
  });

  return io;
};
