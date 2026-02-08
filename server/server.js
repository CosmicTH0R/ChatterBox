import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import xss from 'xss';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import Message from './models/Message.js';
import Room from './models/Room.js';
import User from './models/User.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import friendRoutes from './routes/friendRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';

dotenv.config();

const app = express();

// ===================== SECURITY HEADERS (Helmet.js) =====================
// Helmet sets various HTTP headers to help protect your app
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],  // Allow Cloudinary images
      mediaSrc: ["'self'", "https:", "blob:"],  // Allow Cloudinary media
      connectSrc: ["'self'", "wss:", "ws:", process.env.CLIENT_URL].filter(Boolean),
    },
  },
  crossOriginEmbedderPolicy: false,  // Required for loading external images
  crossOriginResourcePolicy: { policy: "cross-origin" },  // Allow cross-origin resources
}));

// ===================== CORS CONFIG =====================
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL,
].filter(Boolean);
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
app.use(cors(corsOptions));
app.use(express.json());

// ===================== DATABASE =====================
try {
  await connectDB(process.env.MONGO_URI);
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ===================== RATE LIMITING =====================
// Apply global rate limiter to all API routes (100 requests/15 min)
app.use('/api', apiLimiter);

// ===================== REST ROUTES =====================
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

// ===================== SERVER & SOCKET.IO =====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Setup Redis Adapter
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

// ioredis connects automatically
io.adapter(createAdapter(pubClient, subClient));
console.log('✅ Redis Adapter connected');

pubClient.on('error', (err) => console.error('❌ Redis Pub Client Error:', err));
subClient.on('error', (err) => console.error('❌ Redis Sub Client Error:', err));

// ... (SOCKET AUTH - UNCHANGED) ...
io.use(async (socket, next) => {
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

// ===================== USER & ROOM TRACKING =====================
const roomUsers = {}; // Tracks users *per room*
// --- (NEW) --- Tracks all online users and their socket(s)
// Removed globalOnlineUsers Map in favor of Redis

io.on('connection', async (socket) => {
  const { userId, username, name, avatarUrl } = socket.data;

  console.log(
    `🟢 User connected: ${socket.id} - ${username} (${userId})`
  );

  // --- (NEW) --- Join Personal Room & Redis Presence
  socket.join(`user:${userId}`);

  try {
    const count = await pubClient.hincrby('online_users', userId, 1);
    // If first connection (across all servers), notify everyone
    if (count === 1) {
      socket.broadcast.emit('userStatusUpdate', { userId, isOnline: true });
    }
  } catch (e) {
    console.error('Error updating Redis online count:', e)
  }
  
  let userRoomId = ''; // Tracks the *current room* for this socket

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

  // ===================== (MODIFIED) JOIN DM =====================
  socket.on('joinDM', async (data) => {
    const { friendId } = data;
    if (!friendId) {
      return socket.emit('error', 'Friend ID is required.');
    }

    if (friendId === userId) {
      return socket.emit('error', 'Cannot join a DM with yourself.');
    }

    const dmRoomName = [userId, friendId].sort().join('_');
    socket.join(dmRoomName);
    userRoomId = dmRoomName; // Also track this for disconnect

    console.log(`👥 ${username} joined DM: ${dmRoomName}`);

    // --- (NEW) --- Check friend's online status via Redis
    try {
      const isFriendOnline = await pubClient.hexists('online_users', friendId);
      socket.emit('friendStatus', { isOnline: !!isFriendOnline });
    } catch (e) {
      console.error('Error checking friend status:', e)
    }

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

  // ... (sendMessage - UNCHANGED, it already supports DMs) ...
  socket.on('sendMessage', async (data) => {
    const { text, fileUrl, fileType, roomId, friendId } = data; 
    
    // Sanitize text input
    const cleanText = xss(text);

    if ((!cleanText || !cleanText.trim()) && !fileUrl) { 
      return socket.emit('error', 'Cannot send an empty message.');
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
        text: cleanText,
        fileUrl,
        fileType,
        room: roomId,
        timestamp: new Date().toISOString(),
        isPending: true,
      };
      io.to(roomId).emit('receiveMessage', tempMessage);
      try {
        const message = new Message({
          text: cleanText,
          fileUrl,
          fileType,
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
        text: cleanText,
        fileUrl,
        fileType,
        isDM: true,
        participants: [userId, friendId],
        timestamp: new Date().toISOString(),
        isPending: true,
      };
      io.to(dmRoomName).emit('receiveMessage', tempMessage);
      try {
        const message = new Message({
          text: cleanText,
          fileUrl,
          fileType,
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

  // ===================== TYPING INDICATORS =====================
  socket.on('typing', ({ roomId, user }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit('userTyping', user);
  });

  // --- (NEW) FOR DMs: START TYPING ---
  socket.on('dmTyping', ({ friendId }) => {
    if (!friendId) return;
    io.to(`user:${friendId}`).emit('friendTyping');
  });

  // --- (NEW) FOR DMs: STOP TYPING ---
  socket.on('stopDmTyping', ({ friendId }) => {
    if (!friendId) return;
    io.to(`user:${friendId}`).emit('friendStoppedTyping');
  });
  // ... (Moderation Events - UNCHANGED) ...
  socket.on('editMessage', async (data) => {
    try {
      const { messageId, newText } = data;
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', 'Message not found');
      if (message.user.toString() !== userId) {
        return socket.emit('error', "You don't have permission to edit this");
      }
      
      const cleanText = xss(newText);
      if (!cleanText || !cleanText.trim()) return socket.emit('error', 'Message cannot be empty');

      message.text = cleanText;
      message.isEdited = true;
      const saved = await message.save();
      const populated = await saved.populate('user', 'username name avatarUrl');
      let roomToNotify;
      if (message.isDM) {
        roomToNotify = message.participants.sort().join('_');
      } else {
        roomToNotify = message.room.toString();
      }
      io.to(roomToNotify).emit('messageEdited', populated);
    } catch (err) {
      console.error('Edit message error:', err);
      socket.emit('error', 'Could not edit message');
    }
  });
  socket.on('deleteMessage', async (data) => {
    try {
      const { messageId } = data;
      const message = await Message.findById(messageId);
      if (!message) return socket.emit('error', 'Message not found');
      let isAuthor = message.user.toString() === userId;
      let isCreator = false;
      let roomToNotify;
      if (message.isDM) {
        roomToNotify = message.participants.sort().join('_');
      } else {
        roomToNotify = message.room.toString();
        const room = await Room.findById(message.room);
        if (room && room.creator.toString() === userId) {
          isCreator = true;
        }
      }
      if (!isAuthor && !isCreator) {
        return socket.emit('error', "You don't have permission to delete this");
      }
      await Message.findByIdAndDelete(messageId);
      io.to(roomToNotify).emit('messageDeleted', { messageId });
    } catch (err) {
      console.error('Delete message error:', err);
      socket.emit('error', 'Could not delete message');
    }
  });
  socket.on('clearRoomChat', async (data) => {
    try {
      const { roomId } = data;
      const room = await Room.findById(roomId);
      if (!room) return socket.emit('error', 'Room not found');
      if (room.creator.toString() !== userId) {
        return socket.emit('error', 'You are not the room creator');
      }
      await Message.deleteMany({ room: roomId });
      io.to(roomId).emit('chatCleared');
      io.to(roomId).emit('systemMessage', `Chat history cleared by ${username}.`);
    } catch (err) {
      console.error('Clear chat error:', err);
      socket.emit('error', 'Could not clear chat history');
    }
  });
  socket.on('unsendAllMyRoomMessages', async (data) => {
    try {
      const { roomId } = data;
      if (!roomId) return socket.emit('error', 'Room ID is required');
      const result = await Message.deleteMany({ room: roomId, user: userId });
      io.to(roomId).emit('messagesUnsent', { userId });
      socket.emit('systemMessage', `Unsent ${result.deletedCount} of your messages.`);
    } catch (err) {
      console.error('Unsend all room messages error:', err);
      socket.emit('error', 'Could not unsend your messages');
    }
  });
  socket.on('unsendAllMyDMs', async (data) => {
    try {
      const { friendId } = data;
      if (!friendId) return socket.emit('error', 'Friend ID is required');
      const result = await Message.deleteMany({
        isDM: true,
        participants: { $all: [userId, friendId] },
        user: userId,
      });
      const dmRoomName = [userId, friendId].sort().join('_');
      io.to(dmRoomName).emit('messagesUnsent', { userId });
      socket.emit('systemMessage', `Unsent ${result.deletedCount} of your messages.`);
    } catch (err) {
      console.error('Unsend all DM error:', err);
      socket.emit('error', 'Could not unsend your messages');
    }
  });

  // ===================== (MODIFIED) DISCONNECT =====================
  socket.on('disconnect', async () => {
    console.log(`🔴 User disconnected: ${socket.id} - ${username}`);

    // --- (NEW) --- Handle Global Online Status via Redis
    try {
      const count = await pubClient.hincrby('online_users', userId, -1);
      
      if (count <= 0) {
        // User is now fully offline
        await pubClient.hdel('online_users', userId);
        console.log(`🔌 User offline: ${username} (${userId})`);
        
        // Notify all clients
        socket.broadcast.emit('userStatusUpdate', { 
          userId: userId, 
          isOnline: false 
        });
      }
    } catch (e) {
      console.error('Error removing user from online list:', e)
    }

    // --- (EXISTING) --- Handle Room Chat Status
    // Check if user is fully offline (no other tabs)
    try {
      const isOnline = await pubClient.hexists('online_users', userId);
      
      if (!isOnline) {
         for (const roomId in roomUsers) {
           const userIndex = roomUsers[roomId].findIndex(u => u._id === userId);
           if (userIndex !== -1) {
              roomUsers[roomId].splice(userIndex, 1);
              io.to(roomId).emit('updateUserList', roomUsers[roomId]);
              io.to(roomId).emit('systemMessage', `👋 ${username} left the chat.`);
           }
         }
      }
    } catch (e) {
      console.error('Error in disconnect cleanup:', e);
    }
  });
});

// ===================== ERROR HANDLING =====================
app.use(notFound);
app.use(errorHandler);

// ===================== SERVER START =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));