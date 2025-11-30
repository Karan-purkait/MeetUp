// src/routes/users.routes.js
import { Router } from "express";
import {
  addToHistory,
  getUserHistory,
  login,
  register
} from "../controllers/user.controller.js";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/register", register);
router.post("/history", addToHistory);
router.get("/history/:userId", getUserHistory);

export default router;
