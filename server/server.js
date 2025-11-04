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

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173', // Frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());

// Connect to MongoDB
try {
  await connectDB(process.env.MONGO_URI);
  console.log('✅ MongoDB connected successfully');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ✅ SOCKET.IO CONNECTION HANDLER
io.on('connection', (socket) => {
  console.log('🟢 New user connected:', socket.id);

  // ✅ Task 23: Handle room join securely
  socket.on('joinRoom', (data) => {
    // Support both string and object payloads
    const roomName = typeof data === 'string' ? data : data?.roomName;
    const token = typeof data === 'object' ? data?.token : null;

    if (!roomName || !token) {
      socket.emit('error', 'Room name and token are required.');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Store user info in socket session
      socket.data.username = decoded.username;
      socket.data.userId = decoded.id;

      socket.join(roomName);

      console.log(`👥 User ${socket.data.username} (${socket.id}) joined room: ${roomName}`);

      // Send messages to the user and others
      socket.emit('systemMessage', `Welcome to the ${roomName} room!`);
      socket.to(roomName).emit('systemMessage', `👋 ${socket.data.username} has joined the room.`);
    } catch (err) {
      console.error('Socket join error:', err.message);
      socket.emit('error', 'Authentication failed. Please log in again.');
    }
  });

  // ✅ Task 24: Handle "sendMessage"
  socket.on('sendMessage', ({ roomName, text }) => {
    const username = socket.data.username;

    if (!roomName || !text || !username) return;

    const messagePayload = {
      user: username,
      text,
      timestamp: new Date().toISOString(),
    };

    // Broadcast message only to this room
    io.to(roomName).emit('receiveMessage', messagePayload);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
    // Optionally notify the room
    // io.to(roomName).emit('systemMessage', `${socket.data.username} has left the room.`);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
