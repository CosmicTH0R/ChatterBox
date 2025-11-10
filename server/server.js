import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import userRoutes from './routes/userRoutes.js';
import Message from './models/Message.js';
import Room from './models/Room.js';
import User from './models/User.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import friendRoutes from './routes/friendRoutes.js';

dotenv.config();

const app = express();

// ===================== CORS CONFIG =====================
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL,
].filter(Boolean);

// Define CORS options
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

// Use CORS for all routes
app.use(cors(corsOptions));

app.use(express.json());

// ===================== DATABASE =====================
try {
  await connectDB(process.env.MONGO_URI);
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// ===================== REST ROUTES =====================
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);

// ===================== SERVER & SOCKET.IO =====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions, // Use the same options for Socket.IO
});

// ===================== SOCKET AUTH =====================
io.use(async (socket, next) => {
  // ... (your existing auth code is correct)
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id)
      return next(new Error('Authentication error: Invalid token payload'));
    
    const user = await User.findById(decoded.id).select(
      'username name avatarUrl'
    );
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    socket.data.name = user.name || user.username; 
    socket.data.avatarUrl = user.avatarUrl || ''; 

    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return next(new Error('Authentication error'));
  }
});

// ===================== ROOM TRACKING =====================
let roomUsers = {}; 

io.on('connection', (socket) => {
  const { userId, username, name, avatarUrl } = socket.data;

  console.log(
    `🟢 User connected: ${socket.id} - ${username} (${userId})`
  );

  let userRoomId = ''; 

  // ===================== JOIN ROOM =====================
  socket.on('joinRoom', async (data) => {
    // ... (your existing joinRoom code is correct)
    const roomId = typeof data === 'string' ? data : data?.roomId;
    if (!roomId) {
      socket.emit('error', 'Room ID is required.');
      return;
    }

    userRoomId = roomId;
    socket.join(roomId);

    try {
      const history = await Message.find({ room: roomId, isDM: false })
        .sort({ timestamp: 1 })
        .populate('user', 'username name avatarUrl');

      socket.emit('loadHistory', history);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      socket.emit('error', 'Could not load chat history.');
    }

    try {
      const room = await Room.findById(roomId);

      if (room && room.creator) {
        if (room.creator.toString() === userId) {
          socket.emit('roomDetails', { inviteCode: room.inviteCode });
        }
      }
    } catch (err) {
      console.error('Error fetching room details for creator:', err);
    }

    const userInfo = {
      _id: userId,
      username,
      name,
      avatarUrl,
    };

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    if (!roomUsers[roomId].some((u) => u._id === userId)) {
      roomUsers[roomId].push(userInfo);
    }

    console.log(`👥 ${username} joined room ${roomId}`);

    socket.emit('systemMessage', `Welcome to the room!`);
    socket.to(roomId).emit('systemMessage', `👋 ${username} joined the chat.`);
    io.to(roomId).emit('updateUserList', roomUsers[roomId]);
  });

  // ===================== JOIN DM =====================
  socket.on('joinDM', async (data) => {
    // ... (your existing joinDM code is correct)
    const { friendId } = data;
    if (!friendId) {
      return socket.emit('error', 'Friend ID is required.');
    }

    if (friendId === userId) {
      return socket.emit('error', 'Cannot join a DM with yourself.');
    }

    const dmRoomName = [userId, friendId].sort().join('_');
    socket.join(dmRoomName);

    console.log(`👥 ${username} joined DM: ${dmRoomName}`);

    try {
      const history = await Message.find({
        isDM: true,
        participants: { $all: [userId, friendId] },
      })
        .sort({ timestamp: 1 })
        .populate('user', 'username name avatarUrl');

      socket.emit('loadHistory', history);
    } catch (err) {
      console.error('Error fetching DM history:', err);
      socket.emit('error', 'Could not load DM history.');
    }
  });

  // ===================== SEND MESSAGE =====================
  socket.on('sendMessage', async (data) => {
    // ... (your existing sendMessage code is correct)
    const { text, roomId, friendId } = data; 

    if (!text || !userId) {
      return socket.emit('error', 'Invalid message data.');
    }

    const tempUserObject = {
      _id: userId,
      username,
      name,
      avatarUrl,
    };

    if (roomId) {
      const tempMessage = {
        _id: new Date().getTime(),
        user: tempUserObject, 
        text,
        room: roomId,
        timestamp: new Date().toISOString(),
        isPending: true,
      };
      io.to(roomId).emit('receiveMessage', tempMessage);

      try {
        const message = new Message({
          text,
          room: roomId,
          user: userId,
          isDM: false,
        });
        const saved = await message.save();
        const populated = await saved.populate('user', 'username name avatarUrl');

        io.to(roomId).emit('messageConfirmed', {
          tempId: tempMessage._id,
          savedMessage: populated,
        });
      } catch (err) {
        console.error('❌ Room Message save failed:', err.message);
        socket.emit('error', 'Message could not be saved.');
      }
    }
    else if (friendId) {
      const dmRoomName = [userId, friendId].sort().join('_');

      const tempMessage = {
        _id: new Date().getTime(),
        user: tempUserObject,
        text,
        isDM: true,
        participants: [userId, friendId],
        timestamp: new Date().toISOString(),
        isPending: true,
      };
      io.to(dmRoomName).emit('receiveMessage', tempMessage);

      try {
        const message = new Message({
          text,
          user: userId,
          isDM: true,
          participants: [userId, friendId],
        });
        const saved = await message.save();
        const populated = await saved.populate('user', 'username name avatarUrl');

        io.to(dmRoomName).emit('messageConfirmed', {
          tempId: tempMessage._id,
          savedMessage: populated,
        });
      } catch (err) {
        console.error('❌ DM save failed:', err.message);
        socket.emit('error', 'DM could not be saved.');
      }
    }
  });

  // ===================== TYPING INDICATOR =====================
  socket.on('typing', ({ roomId, user }) => {
    // ... (your existing typing code is correct)
    if (!roomId || !user) return;
    socket.to(roomId).emit('userTyping', user);
  });

  // --- (START) ✅ PHASE 9: MODERATION EVENTS ---

  /**
   * @desc    Edit a message
   * @data    { messageId: string, newText: string }
   */
  socket.on('editMessage', async (data) => {
    try {
      const { messageId, newText } = data;

      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', 'Message not found');

      // Check if user is the author
      if (message.user.toString() !== userId) {
        return socket.emit('error', "You don't have permission to edit this");
      }

      message.text = newText;
      message.isEdited = true;
      const saved = await message.save();
      const populated = await saved.populate('user', 'username name avatarUrl');

      // Find the room to broadcast to
      let roomToNotify;
      if (message.isDM) {
        roomToNotify = message.participants.sort().join('_');
      } else {
        roomToNotify = message.room.toString();
      }

      // Emit a new event so frontend can update the message
      io.to(roomToNotify).emit('messageEdited', populated);

    } catch (err) {
      console.error('Edit message error:', err);
      socket.emit('error', 'Could not edit message');
    }
  });

  /**
   * @desc    Delete a single message (Unsend or Remove)
   * @data    { messageId: string }
   */
  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', 'Message not found');

      let isAuthor = message.user.toString() === userId;
      let isCreator = false;

      // Find the room to broadcast to
      let roomToNotify;
      if (message.isDM) {
        roomToNotify = message.participants.sort().join('_');
      } else {
        roomToNotify = message.room.toString();
        // Check for room creator permissions
        const room = await Room.findById(message.room);
        if (room && room.creator.toString() === userId) {
          isCreator = true;
        }
      }

      // Check if user has permission
      if (!isAuthor && !isCreator) {
        return socket.emit('error', "You don't have permission to delete this");
      }

      // Delete the message
      await Message.findByIdAndDelete(messageId);

      // Emit a new event so frontend can remove the message
      io.to(roomToNotify).emit('messageDeleted', { messageId });

    } catch (err) {
      console.error('Delete message error:', err);
      socket.emit('error', 'Could not delete message');
    }
  });

  /**
   * @desc    [Creator] Clear all chat history in a room
   * @data    { roomId: string }
   */
  socket.on('clearRoomChat', async (data) => {
    try {
      const { roomId } = data;
      const room = await Room.findById(roomId);

      if (!room) return socket.emit('error', 'Room not found');

      // Check if user is the creator
      if (room.creator.toString() !== userId) {
        return socket.emit('error', 'You are not the room creator');
      }

      await Message.deleteMany({ room: roomId });

      io.to(roomId).emit('chatCleared'); // Tell clients to clear state
      io.to(roomId).emit('systemMessage', `Chat history cleared by ${username}.`);

    } catch (err) {
      console.error('Clear chat error:', err);
      socket.emit('error', 'Could not clear chat history');
    }
  });

  /**
   * @desc    [User] Unsend all of one's own messages in a room
   * @data    { roomId: string }
   */
  socket.on('unsendAllMyRoomMessages', async (data) => {
    try {
      const { roomId } = data;
      if (!roomId) return socket.emit('error', 'Room ID is required');

      const result = await Message.deleteMany({ room: roomId, user: userId });

      // Tell *all* clients to filter out these messages
      io.to(roomId).emit('messagesUnsent', { userId });
      socket.emit('systemMessage', `Unsent ${result.deletedCount} of your messages.`);

    } catch (err) {
      console.error('Unsend all room messages error:', err);
      socket.emit('error', 'Could not unsend your messages');
    }
  });
  
  /**
   * @desc    [User] Unsend all of one's own messages in a DM
   * @data    { friendId: string }
   */
  socket.on('unsendAllMyDMs', async (data) => {
    try {
      const { friendId } = data;
      if (!friendId) return socket.emit('error', 'Friend ID is required');

      const result = await Message.deleteMany({
        isDM: true,
        participants: { $all: [userId, friendId] },
        user: userId, // Only delete where this user is the author
      });

      const dmRoomName = [userId, friendId].sort().join('_');
      
      // Tell *both* clients to filter out these messages
      io.to(dmRoomName).emit('messagesUnsent', { userId });
      socket.emit('systemMessage', `Unsent ${result.deletedCount} of your messages.`);

    } catch (err) {
      console.error('Unsend all DM error:', err);
      socket.emit('error', 'Could not unsend your messages');
    }
  });

  // --- (END) PHASE 9: MODERATION EVENTS ---

  // ===================== DISCONNECT =====================
  socket.on('disconnect', () => {
    // ... (your existing disconnect code is correct)
    console.log('🔴 Disconnected:', socket.id);

    if (userRoomId && username) {
      if (roomUsers[userRoomId]) {
        roomUsers[userRoomId] = roomUsers[userRoomId].filter(
          (u) => u._id !== userId 
        );
        io.to(userRoomId).emit('updateUserList', roomUsers[userRoomId]);
      }
      io.to(userRoomId).emit('systemMessage', `👋 ${username} left the chat.`);
    }
  });
});

// ===================== ERROR HANDLING =====================
app.use(notFound);
app.use(errorHandler);

// ===================== SERVER START =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));