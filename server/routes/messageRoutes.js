import express from 'express';
import { uploadFile as uploadFileController } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadFile as uploadFileMiddleware } from '../middleware/uploadFileMiddleware.js';
import { messageLimiter } from '../middleware/rateLimitMiddleware.js';

const router = express.Router();

// POST /api/messages/upload-file (rate limited - 30/min)
router.post(
  '/upload-file',
  protect,
  messageLimiter,
  uploadFileMiddleware, // Multer handles the file
  uploadFileController  // Controller sends it to Cloudinary
);

export default router;