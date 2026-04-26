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
import { initializeSocket } from './socket/index.js';

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
initializeSocket(server, corsOptions);

// ===================== ERROR HANDLING =====================
app.use(notFound);
app.use(errorHandler);

// ===================== SERVER START =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));