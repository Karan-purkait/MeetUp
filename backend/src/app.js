// backend/src/app.js
import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import userRoutes from "./routes/users.routes.js";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);

// PORT
const PORT = process.env.PORT || 8000;

// MONGO CONNECTION
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://rikupurkait2003:p5GDmrDr54sgkHty@cluster0.wrzh88s.mongodb.net/MeetUp?retryWrites=true&w=majority&appName=Cluster0";

// =============================
// ✅ CORS CONFIGURATION
// =============================
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",

  // Local backend access
  "http://localhost:8000",

  // ✅ Add your Vercel frontend domain
  "meet-up-zeta-two.vercel.app",

  // If frontend uses a different Vercel preview url
  /\.vercel\.app$/,
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

// =============================
// Test Route
// =============================
app.get("/api/v1/health", (req, res) => {
  res.json({ message: "Backend is running successfully 🚀" });
});

// =============================
// API Routes
// =============================
app.use("/api/v1/users", userRoutes);

// =============================
// Socket.IO Setup
// =============================
connectToSocket(server);

// =============================
// Start Server
// =============================
const start = async () => {
  try {
    const connectionDb = await mongoose.connect(MONGO_URI);
    console.log(`✅ Mongo connected: ${connectionDb.connection.host}`);

    server.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
      console.log(
        `🌍 Backend Live URL: https://meetup-9.onrender.com`
      );
      console.log(`🌐 Frontend should call this URL above`);
    });
  } catch (err) {
    console.error("❌ Mongo connection error:", err.message);
    process.exit(1);
  }
};

start();
