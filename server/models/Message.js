// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false, // <-- 1. SET TO FALSE
    },

    // --- (START) PHASE 8: DM FIELDS ---
    isDM: {
      type: Boolean,
      default: false, // <-- 2. ADDED THIS
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId, // <-- 3. ADDED THIS
        ref: "User",
      },
    ],
    // --- (END) PHASE 8: DM FIELDS ---
  },
  { timestamps: false } // we already have timestamp field manually
);

// Optional optimization for query performance
messageSchema.index({ room: 1, timestamp: 1 });
// Add indexes for DM queries
messageSchema.index({ isDM: 1, participants: 1 });
messageSchema.index({ participants: 1 });

export default mongoose.model("Message", messageSchema);