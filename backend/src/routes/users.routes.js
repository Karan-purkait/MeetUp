import { Router } from "express";
import {
  addToHistory,
  getUserHistory,
  login,
  register
} from "../controllers/user.controller.js";

const router = Router();

// Auth routes
router.post("/auth/login", login);
router.post("/auth/register", register);

// History routes (both patterns for compatibility)
router.post("/history", addToHistory);
router.get("/history", getUserHistory);
router.get("/get_all_activity", getUserHistory);
router.post("/add_to_activity", addToHistory);

export default router;