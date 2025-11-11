import asyncHandler from 'express-async-handler';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Upload a file for a message
 * @route   POST /api/messages/upload-file
 * @access  Private
 */
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded.');
  }

  try {
    // req.file.buffer contains the file data from multer
    const result = await uploadToCloudinary(req.file.buffer);

    if (!result || !result.secure_url) {
      throw new Error('Cloud upload failed, no URL returned.');
    }

    // Determine fileType based on mimetype
    let fileType = 'file'; // Default
    if (req.file.mimetype.startsWith('image/')) {
      fileType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    }

    // Send back the secure URL and the detected file type
    res.status(200).json({
      message: 'File uploaded successfully',
      fileUrl: result.secure_url,
      fileType: fileType,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500);
    throw new Error('Failed to upload file to cloud.');
  }
});