import asyncHandler from 'express-async-handler';
import User from '../models/User.js';

/**
 * @desc    Send a friend request
 * @route   POST /api/friends/send
 * @access  Private
 */
export const sendFriendRequest = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const senderId = req.user.id;

  if (!username) {
    res.status(400);
    throw new Error('Please enter a username');
  }

  // Find the target user by their username
  const targetUser = await User.findOne({ username });

  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  const targetUserId = targetUser._id;

  // Check if trying to send a request to self
  if (senderId === targetUserId.toString()) {
    res.status(400);
    throw new Error('You cannot send a friend request to yourself');
  }

  // Find the sender's user document to check existing relationships
  const senderUser = await User.findById(senderId);

  // Check if they are already friends
  if (senderUser.friends.includes(targetUserId)) {
    res.status(400);
    throw new Error('You are already friends with this user');
  }

  // Check if a request was already sent
  if (senderUser.sentFriendRequests.includes(targetUserId)) {
    res.status(400);
    throw new Error('Friend request already sent');
  }

  // Check if a request was already received from this user
  if (senderUser.receivedFriendRequests.includes(targetUserId)) {
    res.status(400);
    throw new Error('This user has already sent you a friend request. Accept it from your requests.');
  }

  // Update sender's sent requests
  await User.findByIdAndUpdate(senderId, {
    $addToSet: { sentFriendRequests: targetUserId },
  });

  // Update target user's received requests
  await User.findByIdAndUpdate(targetUserId, {
    $addToSet: { receivedFriendRequests: senderId },
  });

  res.status(200).json({ message: 'Friend request sent successfully' });
});

/**
 * @desc    Accept a friend request
 * @route   POST /api/friends/accept
 * @access  Private
 */
export const acceptFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.body; // requestId is the ID of the user who sent the request
  const acceptorId = req.user.id;

  if (!requestId) {
    res.status(400);
    throw new Error('No request ID provided');
  }

  // Find both users
  const acceptor = await User.findById(acceptorId);
  const sender = await User.findById(requestId);

  if (!sender) {
    res.status(404);
    throw new Error('Sender not found');
  }

  // Check if the request actually exists
  if (!acceptor.receivedFriendRequests.includes(requestId)) {
    res.status(400);
    throw new Error('No friend request found from this user');
  }

  // --- Perform the transaction ---

  // 1. Remove request from acceptor's received list
  // 2. Add sender to acceptor's friends list
  await User.findByIdAndUpdate(acceptorId, {
    $pull: { receivedFriendRequests: requestId },
    $addToSet: { friends: requestId },
  });

  // 1. Remove request from sender's sent list
  // 2. Add acceptor to sender's friends list
  await User.findByIdAndUpdate(requestId, {
    $pull: { sentFriendRequests: acceptorId },
    $addToSet: { friends: acceptorId },
  });

  res.status(200).json({ message: 'Friend request accepted' });
});

/**
 * @desc    Reject a friend request
 * @route   POST /api/friends/reject
 * @access  Private
 */
export const rejectFriendRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.body; // ID of the user who sent the request
  const rejectorId = req.user.id;

  if (!requestId) {
    res.status(400);
    throw new Error('No request ID provided');
  }

  // Remove request from rejector's received list
  await User.findByIdAndUpdate(rejectorId, {
    $pull: { receivedFriendRequests: requestId },
  });

  // Remove request from sender's sent list
  await User.findByIdAndUpdate(requestId, {
    $pull: { sentFriendRequests: rejectorId },
  });

  res.status(200).json({ message: 'Friend request rejected' });
});

/**
 * @desc    Remove a friend
 * @route   DELETE /api/friends/:friendId
 * @access  Private
 */
export const removeFriend = asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  const removerId = req.user.id;

  if (!friendId) {
    res.status(400);
    throw new Error('No friend ID provided');
  }

  // Remove friend from remover's friends list
  await User.findByIdAndUpdate(removerId, {
    $pull: { friends: friendId },
  });

  // Remove remover from friend's friends list
  await User.findByIdAndUpdate(friendId, {
    $pull: { friends: removerId },
  });

  res.status(200).json({ message: 'Friend removed successfully' });
});

/**
 * @desc    Get all friends, sent requests, and received requests
 * @route   GET /api/friends/all
 * @access  Private
 */
export const getFriendsAndRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await User.findById(userId)
    .populate({
      path: 'friends',
      select: 'username name avatarUrl', // Only get these fields
    })
    .populate({
      path: 'sentFriendRequests',
      select: 'username name avatarUrl',
    })
    .populate({
      path: 'receivedFriendRequests',
      select: 'username name avatarUrl',
    });

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    friends: user.friends,
    sentRequests: user.sentFriendRequests,
    receivedRequests: user.receivedFriendRequests,
  });
});