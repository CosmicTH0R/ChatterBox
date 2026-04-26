import jwt from 'jsonwebtoken';
import User from '../../models/User.js';

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id)
      return next(new Error('Authentication error: Invalid token payload'));
    
    const user = await User.findById(decoded.id).select(
      'username name avatarUrl'
    );
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.data.userId = user._id.toString();
    socket.data.username = user.username;
    socket.data.name = user.name || user.username; 
    socket.data.avatarUrl = user.avatarUrl || ''; 

    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    return next(new Error('Authentication error'));
  }
};
