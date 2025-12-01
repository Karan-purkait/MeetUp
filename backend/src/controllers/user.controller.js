import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Meeting from "../models/meeting.model.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password required" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email },
      token,
      message: "Login successful"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      message: "Login failed" 
    });
  }
};
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Name, email, and password required" 
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ 
        success: false, 
        message: "Email already in use" 
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hash });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email },
      token,
      message: "Registration successful"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      message: "Registration failed" 
    });
  }
};

// ✅ FIXED: Add proper JWT token verification
export const addToHistory = async (req, res) => {
  try {
    const { token, roomId } = req.body;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Token required" 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret"
    );

    const meeting = await Meeting.create({
      userId: decoded.id,
      roomId: roomId,
      startedAt: new Date(),
      duration: 0,
    });
     return res.status(201).json({ 
      success: true, 
      data: meeting,
      message: "Added to history"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to add to history" 
    });
  }
};

// ✅ FIXED: Get user history with token verification
export const getUserHistory = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Token required" 
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev_secret"
    );

    const meetings = await Meeting.find({ userId: decoded.id })
      .sort({ startedAt: -1 })
      .limit(50);

    return res.json({ 
      success: true, 
      data: meetings,
      message: "History retrieved"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch history" 
    });
  }
};