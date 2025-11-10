import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendsAndRequests,
  getConversations, // <-- 1. Import the new function
} from '../controllers/friendController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes in this file are protected and require a valid token
router.use(protect);

// GET /api/friends/all
// Get all friends and pending/sent requests
router.get('/all', getFriendsAndRequests);

// --- 2. ADD NEW ROUTE ---
// GET /api/friends/conversations
// Get all DM conversations
router.get('/conversations', getConversations);

// POST /api/friends/send
// Send a friend request
router.post('/send', sendFriendRequest);

// POST /api/friends/accept
// Accept a friend request
router.post('/accept', acceptFriendRequest);

// POST /api/friends/reject
// Reject a friend request
router.post('/reject', rejectFriendRequest);

// DELETE /api/friends/:friendId
// Remove a friend
router.delete('/:friendId', removeFriend);

export default router;