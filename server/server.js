import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import Message from './models/Message.js';
import Room from './models/Room.js'; // 1. Import the Room model

dotenv.config();

const app = express();

// ===================== CORS CONFIG =====================
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL,
].filter(Boolean);

app.use(
  cors({
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
  })
);

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

// ===================== SERVER & SOCKET.IO =====================
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// ===================== SOCKET AUTH =====================
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.username = decoded.username;
    socket.data.userId = decoded.id;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// ===================== ROOM TRACKING =====================
let roomUsers = {}; // { 'roomId': ['user1', 'user2'] }

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  let userRoomId = '';
  const username = socket.data.username;
  const userId = socket.data.userId; // Get userId from socket data

  /**
   * ✅ TASK 7 & 19: JOIN ROOM (Modified)
   * Loads history and sends invite code to creator.
   */
  socket.on('joinRoom', async (data) => {
    const roomId = typeof data === 'string' ? data : data?.roomId;
    if (!roomId) {
      socket.emit('error', 'Room ID is required.');
      return;
    }

    userRoomId = roomId;
    socket.join(roomId);

    // 2. Find history (Task 7)
    try {
      const history = await Message.find({ room: roomId })
        .sort({ timestamp: 1 })
        .populate('user', 'username');

      // 3. Send history *only* to the connecting socket (Task 7)
      socket.emit('loadHistory', history);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      socket.emit('error', 'Could not load chat history.');
    }

    // --- ✅ Task 19: Send room details to creator ---
    try {
      const room = await Room.findById(roomId);
      
      // Check if room exists and has a creator
      if (room && room.creator) {
        // Check if the joining user is the creator
        if (room.creator.toString() === userId) {
          // Send invite code *only* to the creator's socket
          socket.emit('roomDetails', { inviteCode: room.inviteCode });
        }
      }
    } catch (err) {
      console.error('Error fetching room details for creator:', err);
      // Don't block joining, just log error
    }

    // --- Keep existing join logic ---
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    if (!roomUsers[roomId].includes(username)) roomUsers[roomId].push(username);

    console.log(`👥 ${username} joined room ${roomId}`);

    socket.emit('systemMessage', `Welcome to the room!`);
    socket.to(roomId).emit('systemMessage', `👋 ${username} joined the chat.`);

    io.to(roomId).emit('updateUserList', roomUsers[roomId]);
  });

  // ===== SEND MESSAGE (ASYNC SAVE + INSTANT BROADCAST) =====
  socket.on('sendMessage', async (data) => {
    const { text, roomId } = data;

    if (!text || !roomId || !userId) {
      socket.emit('error', 'Invalid message data.');
      return;
    }

    // 1️⃣ Broadcast instantly (non-blocking)
    const tempMessage = {
      _id: new Date().getTime(), // Temporary ID for frontend tracking
      user: { _id: userId, username },
      text,
      room: roomId,
      timestamp: new Date().toISOString(),
      isPending: true,
    };
    io.to(roomId).emit('receiveMessage', tempMessage);

    // 2️⃣ Save in background
    try {
      const message = new Message({
        text,
        room: roomId,
        user: userId,
      });
      const saved = await message.save();
      const populated = await saved.populate('user', 'username');

      // 3️⃣ Confirm save to clients
      io.to(roomId).emit('messageConfirmed', {
        tempId: tempMessage._id,
        savedMessage: populated,
      });
    } catch (err) {
      console.error('❌ Message save failed:', err.message);
      socket.emit('error', 'Message could not be saved.');
    }
  });

  // ===== TYPING INDICATOR =====
  socket.on('typing', ({ roomId, user }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit('userTyping', user);
  });

  // ===== DISCONNECT =====
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);

    if (userRoomId && username) {
      if (roomUsers[userRoomId]) {
        roomUsers[userRoomId] = roomUsers[userRoomId].filter(
          (u) => u !== username
        );
        io.to(userRoomId).emit('updateUserList', roomUsers[userRoomId]);
      }
      io.to(userRoomId).emit('systemMessage', `👋 ${username} left the chat.`);
    }
  });
});

// ===================== SERVER START =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));