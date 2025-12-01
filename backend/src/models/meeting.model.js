import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    userId: { 
      type: String, 
      required: true 
    },
    roomId: { 
      type: String, 
      required: true 
    },
    startedAt: { 
      type: Date, 
      default: Date.now 
    },
    duration: { 
      type: Number,  // ✅ CHANGED: String → Number
      default: 0 
    },
    participantCount: {
      type: Number,
      default: 1
    }
      },
  { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);
export default Meeting;