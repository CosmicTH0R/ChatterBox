import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: false, // <-- 1. SET TO FALSE
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
      required: false,
    },

    // --- (START) PHASE 8: DM FIELDS ---
    isDM: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // --- (END) PHASE 8: DM FIELDS ---

    // --- (START) PHASE 9: MODERATION ---
    isEdited: {
      type: Boolean,
      default: false,
    },
    // --- (END) PHASE 9: MODERATION ---

    // --- (START) PHASE 10: RICH MEDIA ---
    fileUrl: {
      type: String, // <-- 2. ADDED
    },
    fileType: {
      type: String, // <-- 3. ADDED (e.g., 'image', 'video', 'audio', 'file')
    },
    // --- (END) PHASE 10: RICH MEDIA ---
  },
  { timestamps: false } // we already have timestamp field manually
);

// Optional optimization for query performance
messageSchema.index({ room: 1, timestamp: 1 });
// Add indexes for DM queries
messageSchema.index({ isDM: 1, participants: 1 });
messageSchema.index({ participants: 1 });

export default mongoose.model("Message", messageSchema);