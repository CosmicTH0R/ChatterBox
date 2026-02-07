import express from "express";
import {
  getAllRooms,
  createRoom,
  getRoomById,
  deleteRoom,
  joinPrivateRoom,
  getMyRooms,
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateCreateRoom,
  validateJoinPrivateRoom,
  validateRoomId,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// GET /api/rooms/myrooms - Get user's private rooms
router.get("/myrooms", protect, getMyRooms);

// GET /api/rooms - Get all public rooms
router.get("/", getAllRooms);

// GET /api/rooms/:id - Get room by ID (validated)
router.get("/:id", validateRoomId, getRoomById);

// POST /api/rooms - Create room (validated)
router.post("/", protect, validateCreateRoom, createRoom);

// DELETE /api/rooms/:id - Delete room (validated)
router.delete("/:id", protect, validateRoomId, deleteRoom);

// POST /api/rooms/join - Join private room (validated)
router.post("/join", protect, validateJoinPrivateRoom, joinPrivateRoom);

export default router;