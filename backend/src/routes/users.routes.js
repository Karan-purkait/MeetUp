import { Router } from "express";

import {
  completeMeetingSession,
  getUserHistory,
  login,
  register,
  startMeetingSession,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/auth/login", login);
router.post("/auth/register", register);

router.get("/history", getUserHistory);
router.post("/history/start", startMeetingSession);
router.patch("/history/:meetingId/complete", completeMeetingSession);

// Compatibility aliases for older frontend calls.
router.get("/get_all_activity", getUserHistory);
router.post("/add_to_activity", startMeetingSession);
router.post("/history", startMeetingSession);

export default router;
