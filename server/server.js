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

// ✅ Dynamically use frontend URLs from .env
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL,
].filter(Boolean); // removes undefined values

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

// ✅ Connect MongoDB
try {
  await connectDB(process.env.MONGO_URI);
  console.log('✅ MongoDB connected successfully');
} catch (error) {
  console.error('❌ MongoDB connection failed:', error.message);
  process.exit(1);
}

// ✅ REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// ✅ Setup Socket.IO with env-based CORS
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// ✅ Socket Handlers
io.on('connection', (socket) => {
  console.log('🟢 New user connected:', socket.id);

  socket.on('joinRoom', (data) => {
    const roomName = typeof data === 'string' ? data : data?.roomName;
    const token = typeof data === 'object' ? data?.token : null;

    if (!roomName || !token) {
      socket.emit('error', 'Room name and token are required.');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.username = decoded.username;
      socket.data.userId = decoded.id;
      socket.join(roomName);

      console.log(`👥 ${socket.data.username} joined ${roomName}`);
      socket.emit('systemMessage', `Welcome to ${roomName}!`);
      socket.to(roomName).emit('systemMessage', `👋 ${socket.data.username} joined.`);
    } catch (err) {
      socket.emit('error', 'Authentication failed.');
    }
  });

  socket.on('sendMessage', ({ roomName, text }) => {
    if (!roomName || !text || !socket.data.username) return;
    io.to(roomName).emit('receiveMessage', {
      user: socket.data.username,
      text,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
