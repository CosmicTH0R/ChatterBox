import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserPublicProfile, // <-- 1. Import the new function
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar as uploadMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Get/Update profile (for the logged-in user)
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Upload avatar (for the logged-in user)
router.post(
  '/upload-avatar',
  protect,
  uploadMiddleware, // Middleware runs first
  uploadAvatar      // Controller runs after
);

// --- 2. ADD NEW ROUTE ---
// Get another user's public profile
router.get('/public/:userId', protect, getUserPublicProfile);

export default router;