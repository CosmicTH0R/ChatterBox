// routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  updatePassword, // <-- 1. Import the new function
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js"; // <-- 2. Import 'protect'

const router = express.Router();

// POST /api/auth/register
router.post("/register", registerUser);

// POST /api/auth/login
router.post("/login", loginUser);

// POST /api/auth/update-password
// 3. Add the new protected route
router.post("/update-password", protect, updatePassword);

export default router;