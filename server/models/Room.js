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

    // New fields for future features
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      // required: false,
      required: [true, "Room creator is required"],
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents with null inviteCode
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", RoomSchema);
export default Room;
