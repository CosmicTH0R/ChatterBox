import Message from '../../models/Message.js';
import Room from '../../models/Room.js';
import { roomUsers } from '../state.js';

export const registerRoomHandlers = (io, socket, pubClient) => {
  const { userId, username, name, avatarUrl } = socket.data;

  socket.on('joinRoom', async (data) => {
    const roomId = typeof data === 'string' ? data : data?.roomId;
    if (!roomId) {
      socket.emit('error', 'Room ID is required.');
      return;
    }

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
};
