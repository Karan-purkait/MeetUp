import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";

import { config } from "./config/env.js";
import userRoutes from "./routes/users.routes.js";
import { connectToSocket } from "./controllers/socketManager.js";

const app = express();
const server = createServer(app);

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  return config.corsOrigins.includes(origin);
};

app.set("trust proxy", 1);
mongoose.set("strictQuery", true);

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ limit: "2mb", extended: true }));

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1/users", userRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

connectToSocket(server, config);

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(config.mongoUri);
    console.log(`Mongo connected: ${connectionDb.connection.host}`);

    server.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
      console.log(`Allowed origins: ${config.corsOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

start();
