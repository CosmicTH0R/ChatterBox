import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      unique: true,
      trim: true,
      minlength: [3, "Room name must be at least 3 characters long"],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Room creator is required"],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    /**
     * ✅ 1. Added 'members' array
     * This will store users who join a private room.
     */
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true } // 'createdAt' is used for the TTL
);

/**
 * ✅ 2. Added TTL Index for automatic deletion
 * This index automatically deletes documents after 86400 seconds (24 hours)
 * ONLY IF 'isPrivate' is true.
 */
RoomSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: { isPrivate: true },
  }
);

const Room = mongoose.model("Room", RoomSchema);
export default Room;