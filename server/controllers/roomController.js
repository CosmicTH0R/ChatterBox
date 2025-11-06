import Room from "../models/Room.js";
import Message from "../models/Message.js"; // 1. Added Message import

/**
 * 🟢 Get all rooms
 * Returns each room with its MongoDB _id (used as roomId on frontend)
 */
export const getAllRooms = async (req, res) => {
  try {
    // ✅ Task 11 requires the creator field to be sent to the frontend
    const rooms = await Room.find({}, "_id name creator createdAt")
      .populate("creator", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: "Server error fetching rooms" });
  }
};

/**
 * 🟣 Create a new room (protected route)
 * Uses req.user.id from auth middleware as creator.
 */
export const createRoom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    } // Check for duplicate name

    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists" });
    } // ✅ Create with creator ID from token

    const newRoom = new Room({
      name,
      creator: req.user.id, // comes from protect middleware
    });

    await newRoom.save();

    res.status(201).json({
      message: "Room created successfully",
      room: {
        _id: newRoom._id,
        name: newRoom.name,
        creator: newRoom.creator,
      },
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ message: "Server error creating room" });
  }
};

/**
 * 🟡 Get single room by ID (for ChatRoomPage)
 */
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(
      req.params.id,
      "_id name creator"
    ).populate("creator", "username email");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.status(200).json(room);
  } catch (err) {
    console.error("Error fetching room by ID:", err);
    res.status(500).json({ message: "Server error fetching room" });
  }
};

/**
 * 🔴 Delete a room (protected route)
 * ✅ Task 10: Checks ownership, then deletes room and all associated messages.
 */
export const deleteRoom = async (req, res) => {
  try {
    // Find the room by its ID from the URL param
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check for ownership: req.user.id comes from 'protect' middleware
    if (room.creator.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this room" });
    }

    // If authorized, delete the room and its messages
    // We use .deleteOne() (modern replacement for .remove())
    await room.deleteOne();
    await Message.deleteMany({ room: room._id });

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("Error deleting room:", err);
    res.status(500).json({ message: "Server error deleting room" });
  }
};