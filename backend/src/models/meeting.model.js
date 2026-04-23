import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    roomId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    participantCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

meetingSchema.index({ userId: 1, startedAt: -1 });

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;
