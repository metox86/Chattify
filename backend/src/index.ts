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
import filesRouter from './files';
import { initDb, getDb } from './db';
import { ExpressPeerServer } from 'peer';

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
app.use('/api/files', filesRouter);

const peerServer = ExpressPeerServer(httpServer, {
  path: '/'
});
app.use('/api/peer', peerServer);

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
      const { receiverId, content, attachments } = data as {
        receiverId: number;
        content: string;
        attachments?: number[];
      };
      
      const result = await db.run(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [userId, receiverId, content]
      );

      const message = await db.get('SELECT * FROM messages WHERE id = ?', result.lastID);

      let attachmentRecords: any[] = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        // Only allow attaching files that the sender owns
        const placeholders = attachments.map(() => '?').join(',');
        const rows = await db.all(
          `SELECT id, original_name, mime_type, size_bytes
           FROM files
           WHERE owner_id = ? AND id IN (${placeholders})`,
          [userId, ...attachments]
        );
        attachmentRecords = rows || [];

        for (const row of attachmentRecords) {
          await db.run('INSERT OR IGNORE INTO message_files (message_id, file_id) VALUES (?, ?)', [
            message.id,
            row.id,
          ]);
        }
      }
      
      // Emit to receiver
      const messageWithAttachments = { ...message, attachments: attachmentRecords };
      socket.to(receiverId.toString()).emit('message-received', messageWithAttachments);
      
      // Callback to sender with the saved message (including timestamp and ID)
      if (typeof callback === 'function') callback({ success: true, message: messageWithAttachments });
    } catch (err) {
      console.error('Error saving message:', err);
      if (typeof callback === 'function') callback({ success: false, error: 'Failed to send' });
    }
  });

  socket.on('send-group-message', async (data, callback) => {
    try {
      const db = getDb();
      const { groupId, content, attachments } = data as {
        groupId: number;
        content: string;
        attachments?: number[];
      };
      
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

      let attachmentRecords: any[] = [];
      if (Array.isArray(attachments) && attachments.length > 0) {
        // Only allow attaching files that the sender owns
        const placeholders = attachments.map(() => '?').join(',');
        const rows = await db.all(
          `SELECT id, original_name, mime_type, size_bytes
           FROM files
           WHERE owner_id = ? AND id IN (${placeholders})`,
          [userId, ...attachments]
        );
        attachmentRecords = rows || [];

        for (const row of attachmentRecords) {
          await db.run(
            'INSERT OR IGNORE INTO group_message_files (group_message_id, file_id) VALUES (?, ?)',
            [message.id, row.id]
          );
        }
      }
      const messageWithAttachments = { ...message, attachments: attachmentRecords };
      
      // Emit to every group member's personal room (same pattern as DM)
      // This works regardless of when members joined — no group rooms needed
      const members = await db.all(
        'SELECT user_id FROM group_members WHERE group_id = ?',
        [groupId]
      );
      members.forEach((m: any) => {
        if (m.user_id !== userId) {
          socket.to(m.user_id.toString()).emit('group-message-received', messageWithAttachments);
        }
      });
      
      if (typeof callback === 'function') callback({ success: true, message: messageWithAttachments });
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

  // Call Signaling
  socket.on('call-user', (data) => {
    socket.to(data.receiverId.toString()).emit('incoming-call', {
      callerId: userId,
      callerUsername: (socket as any).username,
      peerId: data.peerId,
      callType: data.callType === 'video' ? 'video' : 'audio',
      isGroup: false,
      timestamp: Date.now()
    });
  });

  socket.on('call-answered', (data) => {
    socket.to(data.callerId.toString()).emit('call-answered', {
      answererId: userId,
      peerId: data.peerId,
      callType: data.callType === 'video' ? 'video' : 'audio',
    });
  });

  socket.on('call-rejected', (data) => {
    socket.to(data.callerId.toString()).emit('call-rejected', {
      rejecterId: userId
    });
  });

  socket.on('end-call', (data) => {
    if (data.receiverId) {
      socket.to(data.receiverId.toString()).emit('call-ended', { userId });
    }
  });

  socket.on('start-group-call', async (data, callback) => {
    const { groupId, peerId } = data;
    try {
      const db = getDb();
      const members = await db.all('SELECT user_id FROM group_members WHERE group_id = ?', [groupId]);
      const memberIds = members.map((m: any) => m.user_id);
      // Let the starter know the memberIds (so frontend can enforce limits and leave-call fanout).
      if (typeof callback === 'function') callback({ memberIds });
      members.forEach((m: any) => {
        if (m.user_id !== userId) {
          socket.to(m.user_id.toString()).emit('incoming-group-call', {
            groupId,
            callerId: userId,
            callerUsername: (socket as any).username,
            peerId,
            memberIds,
            callType: data.callType === 'video' ? 'video' : 'audio',
            timestamp: Date.now()
          });
        }
      });
    } catch (err) {
      console.error('Error starting group call:', err);
      if (typeof callback === 'function') callback({ memberIds: [] });
    }
  });

  socket.on('join-group-call', (data) => {
    const { groupId, peerId, memberIds } = data;
    memberIds.forEach((mId: any) => {
      if (mId !== userId) {
        socket.to(mId.toString()).emit('group-call-joined', {
          groupId,
          newMemberId: userId,
          peerId,
          username: (socket as any).username
        });
      }
    });
  });

  socket.on('leave-group-call', (data) => {
    const { groupId, memberIds } = data;
    memberIds.forEach((mId: any) => {
      if (mId !== userId) {
        socket.to(mId.toString()).emit('group-call-left', {
          groupId,
          userId
        });
      }
    });
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
