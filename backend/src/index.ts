import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import authRoutes from './auth';
import createChatRouter from './chat';
import { initDb, getDb } from './db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  }
});
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/', authRoutes);
app.use('/api/chat', createChatRouter(io));

// Socket.io Auth
io.use((socket, next) => {
  const cookies = socket.request.headers.cookie;
  if (!cookies) return next(new Error('Authentication error'));
  
  const parsedCookies = parseCookie(cookies);
  const token = parsedCookies.chat_token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).userId = decoded.userId;
    (socket as any).username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  const userId = (socket as any).userId;
  console.log(`User ${userId} connected`);
  
  // Join user's personal room for direct messages
  socket.join(userId.toString());

  // (Group rooms are no longer used — messages go to personal rooms like DM)

  // Broadcast online status
  socket.broadcast.emit('user-online', userId);

  socket.on('send-message', async (data, callback) => {
    try {
      const db = getDb();
      const { receiverId, content } = data;
      
      const result = await db.run(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [userId, receiverId, content]
      );

      const message = await db.get('SELECT * FROM messages WHERE id = ?', result.lastID);
      
      // Emit to receiver
      socket.to(receiverId.toString()).emit('message-received', message);
      
      // Callback to sender with the saved message (including timestamp and ID)
      if (typeof callback === 'function') callback({ success: true, message });
    } catch (err) {
      console.error('Error saving message:', err);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to send' });
    }
  });

  socket.on('send-group-message', async (data, callback) => {
    try {
      const db = getDb();
      const { groupId, content } = data;
      
      const result = await db.run(
        'INSERT INTO group_messages (group_id, sender_id, content) VALUES (?, ?, ?)',
        [groupId, userId, content]
      );

      const message = await db.get(
        `SELECT gm.*, u.username as sender_username 
         FROM group_messages gm 
         JOIN users u ON gm.sender_id = u.id 
         WHERE gm.id = ?`, 
        result.lastID
      );
      
      // Emit to every group member's personal room (same pattern as DM)
      // This works regardless of when members joined — no group rooms needed
      const members = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        [groupId]
      );
      members.forEach((m: any) => {
        if (m.user_id !== userId) {
          socket.to(m.user_id.toString()).emit('group-message-received', message);
        }
      });
      
      if (typeof callback === 'function') callback({ success: true, message });
    } catch (err) {
      console.error('Error saving group message:', err);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to send' });
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.receiverId.toString()).emit('typing', { senderId: userId });
  });

  socket.on('friend-request', (data) => {
    socket.to(data.receiverId.toString()).emit('friend-request', { senderId: userId });
  });

  socket.on('friend-accepted', (data) => {
    socket.to(data.receiverId.toString()).emit('friend-accepted', { senderId: userId });
  });

  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected`);
    socket.broadcast.emit('user-offline', userId);
  });
});

// Database and Server Init
const startServer = async () => {
  try {
    await initDb();
    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
