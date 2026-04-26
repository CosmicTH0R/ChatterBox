import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { socketAuthMiddleware } from './middleware/auth.js';
import { registerRoomHandlers } from './handlers/roomHandler.js';
import { registerMessageHandlers } from './handlers/messageHandler.js';
import { registerPresenceHandlers } from './handlers/presenceHandler.js';

class FakeRedis {
  constructor() { this.store = new Map(); }
  async hincrby(key, field, inc) {
    if (!this.store.has(key)) this.store.set(key, new Map());
    const hash = this.store.get(key);
    const current = hash.get(field) || 0;
    const next = current + inc;
    hash.set(field, next);
    return next;
  }
  async hdel(key, field) {
    if (!this.store.has(key)) return 0;
    const hash = this.store.get(key);
    const deleted = hash.delete(field);
    return deleted ? 1 : 0;
  }
  async hexists(key, field) {
    if (!this.store.has(key)) return 0;
    return this.store.get(key).has(field) ? 1 : 0;
  }
  on() {}
}

export const initializeSocket = (server, corsOptions) => {
  const io = new Server(server, { cors: corsOptions });

  const useRedis = process.env.USE_REDIS === 'true'; // Default to false locally
  let pubClient;

  if (useRedis) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisOptions = {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    };
    pubClient = new Redis(REDIS_URL, redisOptions);
    const subClient = pubClient.duplicate();

    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Redis Adapter connected');

    pubClient.on('error', (err) => console.error('❌ Redis Pub Client Error:', err.message));
    subClient.on('error', (err) => console.error('❌ Redis Sub Client Error:', err.message));
  } else {
    pubClient = new FakeRedis();
    console.log('⚠️ Redis disabled. Using in-memory fallback for Socket.io presence.');
  }

  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const { userId, username } = socket.data;

    console.log(`🟢 User connected: ${socket.id} - ${username} (${userId})`);

    socket.join(`user:${userId}`);

    try {
      const count = await pubClient.hincrby('online_users', userId, 1);
      if (count === 1) {
        socket.broadcast.emit('userStatusUpdate', { userId, isOnline: true });
      }
    } catch (e) {
      console.error('Error updating Redis online count:', e)
    }

    registerRoomHandlers(io, socket, pubClient);
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket, pubClient);
  });

  return io;
};
