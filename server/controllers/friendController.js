import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Message from '../models/Message.js'; // 1. IMPORT MESSAGE MODEL
import mongoose from 'mongoose'; // 2. IMPORT MONGOOSE

/**
 * @desc    Send a friend request
 * @route   POST /api/friends/send
 * @access  Private
 */
export const sendFriendRequest = asyncHandler(async (req, res) => {
  // ... (your existing code is unchanged)
  const { username } = req.body;
  const senderId = req.user.id;

  if (!username) {
    res.status(400);
    throw new Error('Please enter a username');
  }

  const targetUser = await User.findOne({ username });

  if (!targetUser) {
    res.status(404);
    throw new Error('User not found');
  }

  const targetUserId = targetUser._id;

  if (senderId === targetUserId.toString()) {
    res.status(400);
    throw new Error('You cannot send a friend request to yourself');
  }

  const senderUser = await User.findById(senderId);

  if (senderUser.friends.includes(targetUserId)) {
    res.status(400);
    throw new Error('You are already friends with this user');
  }

  if (senderUser.sentFriendRequests.includes(targetUserId)) {
    res.status(400);
    throw new Error('Friend request already sent');
  }

  if (senderUser.receivedFriendRequests.includes(targetUserId)) {
    res.status(400);
    throw new Error('This user has already sent you a friend request. Accept it from your requests.');
  }

  await User.findByIdAndUpdate(senderId, {
    $addToSet: { sentFriendRequests: targetUserId },
  });

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
  // ... (your existing code is unchanged)
  const { requestId } = req.body; 
  const acceptorId = req.user.id;

  if (!requestId) {
    res.status(400);
    throw new Error('No request ID provided');
  }

  const acceptor = await User.findById(acceptorId);
  const sender = await User.findById(requestId);

  if (!sender) {
    res.status(404);
    throw new Error('Sender not found');
  }

  if (!acceptor.receivedFriendRequests.includes(requestId)) {
    res.status(400);
    throw new Error('No friend request found from this user');
  }

  await User.findByIdAndUpdate(acceptorId, {
    $pull: { receivedFriendRequests: requestId },
    $addToSet: { friends: requestId },
  });

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
  // ... (your existing code is unchanged)
  const { requestId } = req.body; 
  const rejectorId = req.user.id;

  if (!requestId) {
    res.status(400);
    throw new Error('No request ID provided');
  }

  await User.findByIdAndUpdate(rejectorId, {
    $pull: { receivedFriendRequests: requestId },
  });

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
  // ... (your existing code is unchanged)
  const { friendId } = req.params;
  const removerId = req.user.id;

  if (!friendId) {
    res.status(400);
    throw new Error('No friend ID provided');
  }

  await User.findByIdAndUpdate(removerId, {
    $pull: { friends: friendId },
  });

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
  // ... (your existing code is unchanged)
  const userId = req.user.id;

  const user = await User.findById(userId)
    .populate({
      path: 'friends',
      select: 'username name avatarUrl', 
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

// --- (START) 3. NEW FUNCTION FOR CONVERSATION LIST ---

/**
 * @desc    Get all DM conversations for a user
 * @route   GET /api/friends/conversations
 * @access  Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const conversations = await Message.aggregate([
    // 1. Find all DM messages involving the current user
    {
      $match: {
        isDM: true,
        participants: userId,
      },
    },
    // 2. Sort by newest first to easily find the "last" message
    {
      $sort: {
        timestamp: -1,
      },
    },
    // 3. Add a field for "the other person" in the chat
    {
      $addFields: {
        otherParticipant: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$participants',
                as: 'p',
                cond: { $ne: ['$$p', userId] },
              },
            },
            0,
          ],
        },
      },
    },
    // 4. Group by "the other person", picking the $first (newest) message
    {
      $group: {
        _id: '$otherParticipant',
        lastMessage: { $first: '$$ROOT' },
      },
    },
    // 5. Populate that "other person's" user details
    {
      $lookup: {
        from: 'users', // The 'users' collection in MongoDB
        localField: '_id',
        foreignField: '_id',
        as: 'withUser',
      },
    },
    // 6. Deconstruct the 'withUser' array (it will only have one element)
    {
      $unwind: '$withUser',
    },
    // 7. Reshape the output to be clean for the frontend
    {
      $project: {
        _id: 0, // Don't need the group _id
        lastMessage: 1,
        withUser: {
          _id: '$withUser._id',
          username: '$withUser.username',
          name: '$withUser.name',
          avatarUrl: '$withUser.avatarUrl',
        },
      },
    },
    // 8. Final sort to put the newest conversations at the top of the list
    {
      $sort: {
        'lastMessage.timestamp': -1,
      },
    },
  ]);

  res.status(200).json(conversations);
});
// --- (END) NEW FUNCTION ---