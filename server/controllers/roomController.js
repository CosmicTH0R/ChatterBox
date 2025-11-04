// controllers/roomController.js
import Room from "../models/Room.js";

// 🟢 Get all rooms
export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching rooms:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟣 Create a new room
export const createRoom = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists" });
    }

    const newRoom = new Room({ name });
    await newRoom.save();

    res.status(201).json({
      message: "Room created successfully",
      room: newRoom,
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ message: "Server error" });
  }
};
