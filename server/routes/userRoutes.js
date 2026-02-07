import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getUserPublicProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar as uploadMiddleware } from '../middleware/uploadMiddleware.js';
import {
  validateUpdateProfile,
  validateUserId,
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// GET /api/users/profile - Get logged-in user's profile
router.get('/profile', protect, getUserProfile);

// PUT /api/users/profile - Update profile (validated)
router.put('/profile', protect, validateUpdateProfile, updateUserProfile);

// POST /api/users/upload-avatar - Upload avatar
router.post(
  '/upload-avatar',
  protect,
  uploadMiddleware,
  uploadAvatar
);

// GET /api/users/public/:userId - Get public profile (validated)
router.get('/public/:userId', protect, validateUserId, getUserPublicProfile);

export default router;