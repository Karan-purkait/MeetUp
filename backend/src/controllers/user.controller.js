import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { config } from "../config/env.js";
import Meeting from "../models/meeting.model.js";
import User from "../models/user.model.js";

const signToken = (userId) =>
  jwt.sign({ id: userId }, config.jwtSecret, { expiresIn: "7d" });

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const extractToken = (req) => {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.body.token || req.query.token || null;
};

const getAuthenticatedUserId = (req) => {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, config.jwtSecret);
  return decoded.id;
};

export const register = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password?.trim();

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token: signToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password?.trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: signToken(user._id.toString()),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

export const startMeetingSession = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const roomId = req.body.roomId?.trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const meeting = await Meeting.create({
      userId,
      roomId,
      startedAt: new Date(),
      status: "active",
    });

    res.status(201).json({
      success: true,
      data: meeting,
      message: "Meeting session started",
    });
  } catch (error) {
    console.error("Start meeting error:", error);

    const statusCode = error.name === "JsonWebTokenError" ? 401 : 500;
    const message =
      error.name === "JsonWebTokenError"
        ? "Invalid token"
        : "Failed to start meeting session";

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

export const completeMeetingSession = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const meetingId = req.params.meetingId;
    const endedAt = req.body.endedAt ? new Date(req.body.endedAt) : new Date();
    const participantCount = Number(req.body.participantCount || 1);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const meeting = await Meeting.findOne({ _id: meetingId, userId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting session not found",
      });
    }

    if (meeting.status === "completed") {
      return res.status(200).json({
        success: true,
        data: meeting,
        message: "Meeting session already completed",
      });
    }

    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - new Date(meeting.startedAt).getTime()) / 1000)
    );

    meeting.endedAt = endedAt;
    meeting.duration = durationSeconds;
    meeting.participantCount = Number.isFinite(participantCount)
      ? Math.max(1, participantCount)
      : 1;
    meeting.status = "completed";

    await meeting.save();

    res.status(200).json({
      success: true,
      data: meeting,
      message: "Meeting session completed",
    });
  } catch (error) {
    console.error("Complete meeting error:", error);

    const statusCode = error.name === "JsonWebTokenError" ? 401 : 500;
    const message =
      error.name === "JsonWebTokenError"
        ? "Invalid token"
        : "Failed to complete meeting session";

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const meetings = await Meeting.find({ userId })
      .sort({ startedAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: meetings,
      message: "History retrieved",
    });
  } catch (error) {
    console.error("Fetch history error:", error);

    const statusCode = error.name === "JsonWebTokenError" ? 401 : 500;
    const message =
      error.name === "JsonWebTokenError"
        ? "Invalid token"
        : "Failed to fetch history";

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};
