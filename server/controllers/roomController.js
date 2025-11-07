import Room from "../models/Room.js";
import Message from "../models/Message.js";
import { nanoid } from "nanoid";

// ... (getAllRooms is fine) ...
export const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find(
      { isPrivate: false },
      "_id name creator createdAt"
    )
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
 * ✅ WORKAROUND: Only add 'inviteCode' field if the room is private.
 */
export const createRoom = async (req, res) => {
  try {
    const { name, isPrivate } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: "Room already exists" });
    }

    // 1. Start building the new room data
    const newRoomData = {
      name,
      creator: req.user.id,
      isPrivate,
      members: [req.user.id], // Add creator to members list
    };

    // 2. Only add inviteCode if it's private
    if (isPrivate) {
      newRoomData.inviteCode = nanoid(6);
    }

    // 3. Create the room. Public rooms will NOT have an inviteCode field.
    const newRoom = new Room(newRoomData);
    await newRoom.save();

    res.status(201).json({
      message: "Room created successfully",
      room: {
        _id: newRoom._id,
        name: newRoom.name,
        creator: newRoom.creator,
        isPrivate: newRoom.isPrivate,
        inviteCode: newRoom.inviteCode || null, // Send back null for consistency
      },
    });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({ message: "Server error creating room" });
  }
};

// ... (getRoomById is fine) ...
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

// ... (deleteRoom is fine) ...
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.creator.toString() !== req.user.id) {
      return res
        .status(401)
        .json({ message: "Not authorized to delete this room" });
    }

    await room.deleteOne();
    await Message.deleteMany({ room: room._id });

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("Error deleting room:", err);
    res.status(500).json({ message: "Server error deleting room" });
  }
};

// ... (joinPrivateRoom is fine) ...
export const joinPrivateRoom = async (req, res) => {
  try {
    const { name, inviteCode } = req.body;
    const userId = req.user.id;

    if (!name || !inviteCode) {
      return res
        .status(400)
        .json({ message: "Room name and invite code are required" });
    }

    const room = await Room.findOne({ name, inviteCode });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Invalid room name or invite code" });
    }

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.status(200).json(room);
  } catch (err) {
    console.error("Error joining private room:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ... (getMyRooms is fine) ...
export const getMyRooms = async (req, res) => {
  try {
    const userId = req.user.id;

    const rooms = await Room.find({
      isPrivate: true,
      $or: [{ creator: userId }, { members: userId }],
    })
      .select("_id name creator inviteCode")
      .populate("creator", "username")
      .sort({ createdAt: -1 });

    res.status(200).json(rooms);
  } catch (err) {
    console.error("Error fetching user's private rooms:", err);
    res.status(500).json({ message: "Server error" });
  }
};
