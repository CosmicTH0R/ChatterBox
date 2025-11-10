import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * @desc    Get user profile (for the logged-in user)
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');

  if (user) {
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name || '', // Ensure we send '' instead of null
      email: user.email,
      avatarUrl: user.avatarUrl || '', // Ensure we send '' instead of null
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
  // Use the robust version that only sets defined fields
  const updatedFields = {};
  if (req.body.name) {
    updatedFields.name = req.body.name;
  }
  if (req.body.email) {
    updatedFields.email = req.body.email;
  }
  if (typeof req.body.avatarUrl === 'string') {
    updatedFields.avatarUrl = req.body.avatarUrl;
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updatedFields }, // Use $set to update only these fields
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      res.status(404);
      throw new Error('User not found');
    }

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
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
    const result = await uploadToCloudinary(req.file.buffer);
    
    // Check if upload was successful
    if (!result || !result.secure_url) {
      throw new Error('Cloud upload failed, no URL returned.');
    }

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

// --- (START) NEW FUNCTION FOR USER INFO MODAL ---

/**
 * @desc    Get any user's public profile and friendship status
 * @route   GET /api/users/public/:userId
 * @access  Private
 */
export const getUserPublicProfile = asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  const currentUserId = req.user.id;

  // 1. Find the user being viewed
  const targetUser = await User.findById(targetUserId).select(
    'username name avatarUrl'
  );

  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  // 2. Check if the current user is viewing their own profile
  if (targetUserId === currentUserId) {
    return res.json({
      user: targetUser,
      status: { isSelf: true },
    });
  }

  // 3. Find the current user to check friend status
  const currentUser = await User.findById(currentUserId).select(
    'friends sentFriendRequests receivedFriendRequests'
  );

  if (!currentUser) {
    res.status(404);
    throw new Error('Current user not found');
  }

  // 4. Determine the relationship status
  const status = {
    isSelf: false,
    isFriend: currentUser.friends.includes(targetUserId),
    isRequestSent: currentUser.sentFriendRequests.includes(targetUserId),
    isRequestReceived: currentUser.receivedFriendRequests.includes(targetUserId),
  };

  res.json({ user: targetUser, status });
});
// --- (END) NEW FUNCTION ---