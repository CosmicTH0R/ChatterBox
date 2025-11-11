import express from 'express';
import { uploadFile as uploadFileController } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadFile as uploadFileMiddleware } from '../middleware/uploadFileMiddleware.js';

const router = express.Router();

// POST /api/messages/upload-file
router.post(
  '/upload-file',
  protect,
  uploadFileMiddleware, // 1. Multer handles the file
  uploadFileController  // 2. Controller sends it to Cloudinary
);

export default router;