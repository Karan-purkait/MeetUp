import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, "../../.env");

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

parseEnvFile(envFilePath);

const isProduction = process.env.NODE_ENV === "production";

const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const allowedOrigins = [
  ...defaultOrigins,
  ...parseOrigins(process.env.CORS_ORIGINS),
];

const ensureRequired = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV || "development",
  isProduction,
  port: Number(process.env.PORT || 8000),
  mongoUri: isProduction
    ? ensureRequired("MONGO_URI")
    : process.env.MONGO_URI || "mongodb://127.0.0.1:27017/meetup",
  jwtSecret: isProduction
    ? ensureRequired("JWT_SECRET")
    : process.env.JWT_SECRET || "meetup-local-dev-secret",
  corsOrigins: allowedOrigins,
  socketMaxBufferSize: Number(process.env.SOCKET_MAX_BUFFER_SIZE || 8 * 1024 * 1024),
  chatMediaMaxBytes: Number(process.env.CHAT_MEDIA_MAX_BYTES || 5 * 1024 * 1024),
};
