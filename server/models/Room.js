// models/Room.js
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
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", RoomSchema);
export default Room;
