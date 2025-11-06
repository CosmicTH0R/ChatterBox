import express from "express";
import {
  getAllRooms,
  createRoom,
  getRoomById,
  deleteRoom, // 1. Import the new controller
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Retrieve all rooms
router.get("/", getAllRooms);

// Retrieve a specific room by its ID (used in ChatRoomPage)
router.get("/:id", getRoomById);

// Create a new room (protected route)
router.post("/", protect, createRoom);

//  Create a new route: DELETE /api/rooms/:id
router.delete("/:id", protect, deleteRoom);

export default router;