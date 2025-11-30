// src/models/meeting.model.js
import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    roomId: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    duration: { type: String }
  },
  { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting; // ✅ THIS is the default export
