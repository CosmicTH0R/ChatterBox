import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from '../controllers/userController.js'; // <-- It imports here
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar as uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Get/Update profile
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Add the new avatar upload route
router.post(
  '/upload-avatar',
  protect,
  uploadMiddleware, // Middleware runs first
  uploadAvatar      // Controller runs after
);

export default router;