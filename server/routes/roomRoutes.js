import express from "express";
import {
  getAllRooms,
  createRoom,
  getRoomById,
  deleteRoom,
  joinPrivateRoom,
  getMyRooms, // 1. Import the new 'getMyRooms' controller
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * ✅ New: GET /api/rooms/myrooms
 * Gets all private rooms a user is a member of or created
 */
router.get("/myrooms", protect, getMyRooms); // 2. Add the new route

// Retrieve all public rooms
router.get("/", getAllRooms); // This now only gets public rooms

// Retrieve a specific room by its ID
router.get("/:id", getRoomById);

// Create a new room (public or private)
router.post("/", protect, createRoom);

// Delete a room
router.delete("/:id", protect, deleteRoom);

/**
 * ✅ Task 18: Create a new route: POST /api/rooms/join
 * This handles the "Join Private Room" form
 */
router.post("/join", protect, joinPrivateRoom);

export default router;