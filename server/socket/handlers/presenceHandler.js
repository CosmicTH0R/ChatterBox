import { roomUsers } from '../state.js';

export const registerPresenceHandlers = (io, socket, pubClient) => {
  const { userId, username } = socket.data;

  socket.on('typing', ({ roomId, user }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit('userTyping', user);
  });

  socket.on('dmTyping', ({ friendId }) => {
    if (!friendId) return;
    io.to(`user:${friendId}`).emit('friendTyping');
  });

  socket.on('stopDmTyping', ({ friendId }) => {
    if (!friendId) return;
    io.to(`user:${friendId}`).emit('friendStoppedTyping');
  });

  socket.on('disconnect', async () => {
    console.log(`🔴 User disconnected: ${socket.id} - ${username}`);

    try {
      const count = await pubClient.hincrby('online_users', userId, -1);
      
      if (count <= 0) {
        await pubClient.hdel('online_users', userId);
        console.log(`🔌 User offline: ${username} (${userId})`);
        
        socket.broadcast.emit('userStatusUpdate', { 
          userId: userId, 
          isOnline: false 
        });
      }
    } catch (e) {
      console.error('Error removing user from online list:', e)
    }

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
};
