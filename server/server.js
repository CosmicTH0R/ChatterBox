import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Dynamically use frontend URLs from .env
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

// Connect MongoDB
try {
  await connectDB(process.env.MONGO_URI);
  console.log('✅ MongoDB connected successfully');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Setup Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// JWT Middleware for secure connections
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

// Global object to track users per room
let roomUsers = {}; // { 'roomName': ['user1', 'user2'] }

// Socket.IO connection logic
io.on('connection', (socket) => {
  console.log('🟢 New user connected:', socket.id);

  let userRoom = '';
  let username = '';

  // Join room
  socket.on('joinRoom', (data) => {
    const roomName = typeof data === 'string' ? data : data?.roomName;
    if (!roomName) {
      socket.emit('error', 'Room name is required.');
      return;
    }

    username = socket.data.username;
    userRoom = roomName;

    socket.join(userRoom);

    // Add user to roomUsers
    if (!roomUsers[userRoom]) roomUsers[userRoom] = [];
    if (!roomUsers[userRoom].includes(username)) roomUsers[userRoom].push(username);

    console.log(`👥 ${username} joined ${userRoom}`);

    // Emit welcome/system messages
    socket.emit('systemMessage', `Welcome to ${userRoom}!`);
    socket.to(userRoom).emit('systemMessage', `👋 ${username} joined.`);

    // Emit updated online users list
    io.to(userRoom).emit('updateUserList', roomUsers[userRoom]);
  });

  // Send message
  socket.on('sendMessage', ({ roomName, text }) => {
    if (!roomName || !text || !socket.data.username) return;
    io.to(roomName).emit('receiveMessage', {
      user: socket.data.username,
      text,
      timestamp: new Date().toISOString(),
    });
  });

  // Typing indicator
  socket.on('typing', ({ roomName, user }) => {
    if (!roomName || !user) return;
    socket.to(roomName).emit('userTyping', user); // broadcast to others in room
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);

    if (userRoom && username) {
      // Remove user from roomUsers
      if (roomUsers[userRoom]) {
        roomUsers[userRoom] = roomUsers[userRoom].filter((u) => u !== username);
        // Emit updated user list
        io.to(userRoom).emit('updateUserList', roomUsers[userRoom]);
      }
      // Broadcast system message
      io.to(userRoom).emit('systemMessage', `👋 ${username} has left.`);
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
