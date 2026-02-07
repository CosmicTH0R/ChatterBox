// routes/authRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  updatePassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  validateRegister,
  validateLogin,
  validateUpdatePassword,
} from "../middleware/validationMiddleware.js";

const router = express.Router();

// POST /api/auth/register (validated + rate limited)
router.post("/register", authLimiter, validateRegister, registerUser);

// POST /api/auth/login (validated + rate limited)
router.post("/login", authLimiter, validateLogin, loginUser);

// POST /api/auth/update-password (protected + validated)
router.post("/update-password", protect, validateUpdatePassword, updatePassword);

export default router;