// backend/src/app.js
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import userRoutes from "./routes/users.routes.js";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 8000;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://rikupurkait2003:p5GDmrDr54sgkHty@cluster0.wrzh88s.mongodb.net/MeetUp?retryWrites=true&w=majority&appName=Cluster0";

app.set("port", PORT);

// ✅ CORS CONFIGURATION - Allow frontend to access backend
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:8000",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Test endpoint
app.get("/api/v1/health", (req, res) => {
  res.json({ message: "Backend is running" });
});

// routes
app.use("/api/v1/users", userRoutes);

// connect sockets
connectToSocket(server);

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(MONGO_URI);
    console.log(`✅ Mongo connected: ${connectionDb.connection.host}`);

    server.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(`📍 Frontend can access: http://localhost:3000`);
    });
  } catch (err) {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  }
};

start();