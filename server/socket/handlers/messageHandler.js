import Message from '../../models/Message.js';
import Room from '../../models/Room.js';
import xss from 'xss';

export const registerMessageHandlers = (io, socket) => {
  const { userId, username, name, avatarUrl } = socket.data;

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
};
