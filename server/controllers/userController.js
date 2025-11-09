import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  // req.user.id is set by our 'protect' middleware
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { name, email, avatarUrl } = req.body;

  // Build an object with only the fields we want to update
  const updatedFields = {
    name,
    email,
    avatarUrl,
  };

  try {
    // Find the user by their ID and update them with the new fields
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatedFields }, // Use $set to update only these fields
      { new: true, runValidators: true } // `new: true` returns the *new*, updated document
    ).select('-password'); // Don't send the password back

    if (!updatedUser) {
      res.status(404);
      throw new Error('User not found');
    }

    // Send the fully updated user back to the frontend
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
    });

  } catch (error) {
    // This will catch duplicate email errors from the 'unique: true' schema
    res.status(400);
    throw new Error('Error updating profile. Email may already be taken.');
  }
});

/**
 * @desc    Upload a new avatar
 * @route   POST /api/users/upload-avatar
 * @access  Private
 */
export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded.');
  }

  try {
    // req.file.buffer contains the image data from multer
    const result = await uploadToCloudinary(req.file.buffer);
    
    // Send back the secure URL
    res.status(200).json({
      message: 'Avatar uploaded successfully',
      url: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    throw new Error('Failed to upload image to cloud.');
  }
});