import express from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendsAndRequests,
  getConversations,
} from '../controllers/friendController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  validateSendFriendRequest,
  validateFriendRequestAction,
  validateFriendId,
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// All routes in this file are protected
router.use(protect);

// GET /api/friends/all - Get friends and pending requests
router.get('/all', getFriendsAndRequests);

// GET /api/friends/conversations - Get DM conversations
router.get('/conversations', getConversations);

// POST /api/friends/send - Send friend request (validated)
router.post('/send', validateSendFriendRequest, sendFriendRequest);

// POST /api/friends/accept - Accept request (validated)
router.post('/accept', validateFriendRequestAction, acceptFriendRequest);

// POST /api/friends/reject - Reject request (validated)
router.post('/reject', validateFriendRequestAction, rejectFriendRequest);

// DELETE /api/friends/:friendId - Remove friend (validated)
router.delete('/:friendId', validateFriendId, removeFriend);

export default router;