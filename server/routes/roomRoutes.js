// routes/roomRoutes.js
import express from "express";
import { getAllRooms, createRoom } from "../controllers/roomController.js";
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", getAllRooms);   // GET /api/rooms
router.post('/', protect, createRoom);   // POST /api/rooms

export default router;
