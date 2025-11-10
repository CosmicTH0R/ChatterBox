// import express from 'express';
// import http from 'http';
// import { Server } from 'socket.io';
// import dotenv from 'dotenv';
// import cors from 'cors';
// import jwt from 'jsonwebtoken';
// import { connectDB } from './config/db.js';
// import authRoutes from './routes/authRoutes.js';
// import roomRoutes from './routes/roomRoutes.js';
// import userRoutes from './routes/userRoutes.js';
// import Message from './models/Message.js';
// import Room from './models/Room.js';
// import User from './models/User.js'; // <-- 1. IMPORT USER MODEL
// import { notFound, errorHandler } from './middleware/errorMiddleware.js';
// import friendRoutes from './routes/friendRoutes.js';

// dotenv.config();

// const app = express();

// // ===================== CORS CONFIG =====================
// const allowedOrigins = [
//   process.env.CLIENT_URL,
//   process.env.CLIENT_URL_LOCAL,
// ].filter(Boolean);

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.warn(`🚫 CORS blocked request from: ${origin}`);
//         callback(new Error('Not allowed by CORS'));
//       }
//     },
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
//   })
// );

// app.use(express.json());

// // ===================== DATABASE =====================
// try {
//   await connectDB(process.env.MONGO_URI);
// } catch (error) {
//   console.error('❌ MongoDB connection failed:', error.message);
//   process.exit(1);
// }

// // ===================== REST ROUTES =====================
// app.use('/api/auth', authRoutes);
// app.use('/api/rooms', roomRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/friends', friendRoutes);

// // ===================== SERVER & SOCKET.IO =====================
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: allowedOrigins,
//     methods: ['GET', 'POST'],
//   },
// });

// // ===================== 2. UPGRADED SOCKET AUTH =====================
// io.use(async (socket, next) => {
//   try {
//     const token = socket.handshake.auth?.token;
//     if (!token) return next(new Error('Authentication error: No token'));

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded.id)
//       return next(new Error('Authentication error: Invalid token payload'));

//     // Fetch user info to attach to socket
//     const user = await User.findById(decoded.id).select(
//       'username name avatarUrl'
//     );
//     if (!user) return next(new Error('Authentication error: User not found'));

//     // Attach all user data to the socket for this connection
//     socket.data.userId = user._id.toString();
//     socket.data.username = user.username;
//     socket.data.name = user.name || user.username; // Fallback to username if no name
//     socket.data.avatarUrl = user.avatarUrl || ''; // Default empty string

//     next();
//   } catch (err) {
//     console.error('Socket auth error:', err.message);
//     return next(new Error('Authentication error'));
//   }
// });

// // ===================== 3. ROOM TRACKING (NOW STORES OBJECTS) =====================
// let roomUsers = {}; // { 'roomId': [{ _id, username, name, avatarUrl }, ...] }

// io.on('connection', (socket) => {
//   // All this data is now available from the auth middleware
//   const { userId, username, name, avatarUrl } = socket.data;

//   console.log(
//     `🟢 User connected: ${socket.id} - ${username} (${userId})`
//   );

//   let userRoomId = ''; // This is for public/private rooms

//   /**
//    * ✅ TASK 7 & 19: JOIN (Public/Private) ROOM
//    */
//   socket.on('joinRoom', async (data) => {
//     const roomId = typeof data === 'string' ? data : data?.roomId;
//     if (!roomId) {
//       socket.emit('error', 'Room ID is required.');
//       return;
//     }

//     userRoomId = roomId;
//     socket.join(roomId);

//     // 2. Find history
//     try {
//       const history = await Message.find({ room: roomId, isDM: false })
//         .sort({ timestamp: 1 })
//         .populate('user', 'username name avatarUrl');

//       socket.emit('loadHistory', history);
//     } catch (err) {
//       console.error('Error fetching chat history:', err);
//       socket.emit('error', 'Could not load chat history.');
//     }

//     // --- Task 19: Send room details ---
//     try {
//       const room = await Room.findById(roomId);

//       if (room && room.creator) {
//         if (room.creator.toString() === userId) {
//           socket.emit('roomDetails', { inviteCode: room.inviteCode });
//         }
//       }
//     } catch (err) {
//       console.error('Error fetching room details for creator:', err);
//     }

//     // --- 4. MODIFIED USER LIST LOGIC (FIXES SIDEBAR) ---
//     const userInfo = {
//       _id: userId,
//       username,
//       name,
//       avatarUrl,
//     };

//     if (!roomUsers[roomId]) roomUsers[roomId] = [];
//     // Check if user (by ID) is already in the list
//     if (!roomUsers[roomId].some((u) => u._id === userId)) {
//       roomUsers[roomId].push(userInfo);
//     }

//     console.log(`👥 ${username} joined room ${roomId}`);

//     socket.emit('systemMessage', `Welcome to the room!`);
//     socket.to(roomId).emit('systemMessage', `👋 ${username} joined the chat.`);

//     // This now sends the full array of user objects
//     io.to(roomId).emit('updateUserList', roomUsers[roomId]);
//   });

//   // --- JOIN DM ---
//   socket.on('joinDM', async (data) => {
//     const { friendId } = data;
//     if (!friendId) {
//       return socket.emit('error', 'Friend ID is required.');
//     }

//     if (friendId === userId) {
//       return socket.emit('error', 'Cannot join a DM with yourself.');
//     }

//     const dmRoomName = [userId, friendId].sort().join('_');
//     socket.join(dmRoomName);

//     console.log(`👥 ${username} joined DM: ${dmRoomName}`);

//     // Load DM history
//     try {
//       const history = await Message.find({
//         isDM: true,
//         participants: { $all: [userId, friendId] },
//       })
//         .sort({ timestamp: 1 })
//         .populate('user', 'username name avatarUrl');

//       socket.emit('loadHistory', history);
//     } catch (err) {
//       console.error('Error fetching DM history:', err);
//       socket.emit('error', 'Could not load DM history.');
//     }
//   });

//   // --- SEND MESSAGE (FIXES CHAT FLICKER) ---
//   socket.on('sendMessage', async (data) => {
//     const { text, roomId, friendId } = data;

//     if (!text || !userId) {
//       return socket.emit('error', 'Invalid message data.');
//     }

//     // This object now has all the data it needs from socket.data
//     const tempUserObject = {
//       _id: userId,
//       username,
//       name,
//       avatarUrl,
//     };

//     // --- BRANCH 1: Public/Private Room Message ---
//     if (roomId) {
//       const tempMessage = {
//         _id: new Date().getTime(),
//         user: tempUserObject, // <-- This is now fully populated
//         text,
//         room: roomId,
//         timestamp: new Date().toISOString(),
//         isPending: true,
//       };
//       io.to(roomId).emit('receiveMessage', tempMessage);

//       try {
//         const message = new Message({
//           text,
//           room: roomId,
//           user: userId,
//           isDM: false,
//         });
//         const saved = await message.save();
//         const populated = await saved.populate('user', 'username name avatarUrl');

//         io.to(roomId).emit('messageConfirmed', {
//           tempId: tempMessage._id,
//           savedMessage: populated,
//         });
//       } catch (err) {
//         console.error('❌ Room Message save failed:', err.message);
//         socket.emit('error', 'Message could not be saved.');
//       }
//     }
//     // --- BRANCH 2: Direct Message (DM) ---
//     else if (friendId) {
//       const dmRoomName = [userId, friendId].sort().join('_');

//       const tempMessage = {
//         _id: new Date().getTime(),
//         user: tempUserObject, // <-- This is also fully populated
//         text,
//         isDM: true,
//         participants: [userId, friendId],
//         timestamp: new Date().toISOString(),
//         isPending: true,
//       };
//       io.to(dmRoomName).emit('receiveMessage', tempMessage);

//       try {
//         const message = new Message({
//           text,
//           user: userId,
//           isDM: true,
//           participants: [userId, friendId],
//         });
//         const saved = await message.save();
//         const populated = await saved.populate('user', 'username name avatarUrl');

//         io.to(dmRoomName).emit('messageConfirmed', {
//           tempId: tempMessage._id,
//           savedMessage: populated,
//         });
//       } catch (err) {
//         console.error('❌ DM save failed:', err.message);
//         socket.emit('error', 'DM could not be saved.');
//       }
//     }
//   });

//   // ===== TYPING INDICATOR =====
//   socket.on('typing', ({ roomId, user }) => {
//     if (!roomId || !user) return;
//     socket.to(roomId).emit('userTyping', user);
//   });

//   // ===== 5. DISCONNECT (UPDATED FOR OBJECTS) =====
//   socket.on('disconnect', () => {
//     console.log('🔴 Disconnected:', socket.id);

//     if (userRoomId && username) {
//       if (roomUsers[userRoomId]) {
//         // Filter by user ID instead of username string
//         roomUsers[userRoomId] = roomUsers[userRoomId].filter(
//           (u) => u._id !== userId 
//         );
//         io.to(userRoomId).emit('updateUserList', roomUsers[userRoomId]);
//       }
//       io.to(userRoomId).emit('systemMessage', `👋 ${username} left the chat.`);
//     }
//   });
// });

// // ===================== ERROR HANDLING =====================
// app.use(notFound);
// app.use(errorHandler);

// // ===================== SERVER START =====================
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));









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
app.use(express.json()); // Moved this up

// ===================== 1. DEFINED CORS OPTIONS =====================
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL,
].filter(Boolean);

// Define CORS options as an object
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

// ===================== 2. HANDLE PREFLIGHT REQUESTS =====================
// This is the fix. It tells Express to answer OPTIONS requests with our CORS rules.
// This MUST come before your other routes.
app.options('*', cors(corsOptions));

// ===================== 3. USE CORS FOR ALL OTHER REQUESTS =====================
app.use(cors(corsOptions));

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
  cors: corsOptions, // Use the same corsOptions object for Socket.IO
});

// ===================== SOCKET AUTH =====================
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id)
      return next(new Error('Authentication error: Invalid token payload'));

    // Fetch user info to attach to socket
    const user = await User.findById(decoded.id).select(
      'username name avatarUrl'
    );
    if (!user) return next(new Error('Authentication error: User not found'));

    // Attach all user data to the socket for this connection
    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    socket.data.name = user.name || user.username; // Fallback to username if no name
    socket.data.avatarUrl = user.avatarUrl || ''; // Default empty string

    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return next(new Error('Authentication error'));
  }
});

// ===================== ROOM TRACKING =====================
let roomUsers = {}; // { 'roomId': [{ _id, username, name, avatarUrl }, ...] }

io.on('connection', (socket) => {
  // All this data is now available from the auth middleware
  const { userId, username, name, avatarUrl } = socket.data;

  console.log(
    `🟢 User connected: ${socket.id} - ${username} (${userId})`
  );

  let userRoomId = ''; // This is for public/private rooms

  // ... (rest of your socket events 'joinRoom', 'joinDM', 'sendMessage', 'disconnect' are all correct) ...
  
  socket.on('joinRoom', async (data) => {
    const roomId = typeof data === 'string' ? data : data?.roomId;
    if (!roomId) {
      socket.emit('error', 'Room ID is required.');
      return;
    }

    userRoomId = roomId;
    socket.join(roomId);

    // 2. Find history
    try {
      const history = await Message.find({ room: roomId, isDM: false })
        .sort({ timestamp: 1 })
        .populate('user', 'username name avatarUrl');

      socket.emit('loadHistory', history);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      socket.emit('error', 'Could not load chat history.');
    }

    // --- Task 19: Send room details ---
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

    // --- 4. MODIFIED USER LIST LOGIC (FIXES SIDEBAR) ---
    const userInfo = {
      _id: userId,
      username,
      name,
      avatarUrl,
    };

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    // Check if user (by ID) is already in the list
    if (!roomUsers[roomId].some((u) => u._id === userId)) {
      roomUsers[roomId].push(userInfo);
    }

    console.log(`👥 ${username} joined room ${roomId}`);

    socket.emit('systemMessage', `Welcome to the room!`);
    socket.to(roomId).emit('systemMessage', `👋 ${username} joined the chat.`);

    // This now sends the full array of user objects
    io.to(roomId).emit('updateUserList', roomUsers[roomId]);
  });

  // --- JOIN DM ---
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

    console.log(`👥 ${username} joined DM: ${dmRoomName}`);

    // Load DM history
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

  // --- SEND MESSAGE (FIXES CHAT FLICKER) ---
  socket.on('sendMessage', async (data) => {
    const { text, roomId, friendId } = data;

    if (!text || !userId) {
      return socket.emit('error', 'Invalid message data.');
    }

    // This object now has all the data it needs from socket.data
    const tempUserObject = {
      _id: userId,
      username,
      name,
      avatarUrl,
    };

    // --- BRANCH 1: Public/Private Room Message ---
    if (roomId) {
      const tempMessage = {
        _id: new Date().getTime(),
        user: tempUserObject, // <-- This is now fully populated
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
    // --- BRANCH 2: Direct Message (DM) ---
    else if (friendId) {
      const dmRoomName = [userId, friendId].sort().join('_');

      const tempMessage = {
        _id: new Date().getTime(),
        user: tempUserObject, // <-- This is also fully populated
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

  // ===== TYPING INDICATOR =====
  socket.on('typing', ({ roomId, user }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit('userTyping', user);
  });

  // ===== 5. DISCONNECT (UPDATED FOR OBJECTS) =====
  socket.on('disconnect', () => {
    console.log('🔴 Disconnected:', socket.id);

    if (userRoomId && username) {
      if (roomUsers[userRoomId]) {
        // Filter by user ID instead of username string
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