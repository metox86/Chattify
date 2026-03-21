import express from 'express';
import { getDb } from './db';
import { requireAuth } from './auth';

const router = express.Router();

router.use(requireAuth);

router.get('/users', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  
  try {
    let users;
    if (search) {
      users = await db.all(
        'SELECT id, username FROM users WHERE username LIKE ? AND id != ? LIMIT 20',
        [`%${search}%`, currentUserId]
      );
    } else {
      users = await db.all(
        'SELECT id, username FROM users WHERE id != ? LIMIT 50',
        [currentUserId]
      );
    }
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/messages/:withUserId', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  const withUserId = parseInt(req.params.withUserId as string, 10);
  
  if (isNaN(withUserId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  try {
    const messages = await db.all(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY created_at ASC`,
      [currentUserId, withUserId, withUserId, currentUserId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/conversations', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  
  try {
    // Get unique users that the current user has exchanged messages with
    const conversations = await db.all(
      `SELECT DISTINCT u.id, u.username 
       FROM users u 
       JOIN messages m ON (u.id = m.sender_id OR u.id = m.receiver_id) 
       WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?`,
      [currentUserId, currentUserId, currentUserId]
    );

    // Fetch last message for each conversation
    for (let currentConv of conversations) {
        const lastMessage = await db.get(
            `SELECT content, created_at, is_read, sender_id 
             FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) 
             ORDER BY created_at DESC LIMIT 1`,
             [currentUserId, currentConv.id, currentConv.id, currentUserId]
        );
        currentConv.lastMessage = lastMessage;
    }
    
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/friendship/:userId', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  const targetId = parseInt(req.params.userId as string, 10);
  
  if (isNaN(targetId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  try {
    const friendship = await db.get(
      `SELECT * FROM friendships 
       WHERE (requester_id = ? AND receiver_id = ?) 
          OR (requester_id = ? AND receiver_id = ?)`,
      [currentUserId, targetId, targetId, currentUserId]
    );

    if (!friendship) {
      res.json({ status: 'none' });
    } else if (friendship.status === 'accepted') {
      res.json({ status: 'accepted' });
    } else if (friendship.requester_id === currentUserId) {
      res.json({ status: 'pending' });
    } else {
      res.json({ status: 'received' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/friend-request', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  const { targetId } = req.body;
  
  try {
    await db.run(
      'INSERT INTO friendships (requester_id, receiver_id, status) VALUES (?, ?, ?)',
      [currentUserId, targetId, 'pending']
    );
    res.json({ success: true, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/friend-accept', async (req: express.Request, res: express.Response): Promise<void> => {
  const db = getDb();
  const currentUserId = (req as any).userId;
  const { targetId } = req.body; // targetId implies the requester_id
  
  try {
    await db.run(
      `UPDATE friendships SET status = 'accepted' 
       WHERE requester_id = ? AND receiver_id = ?`,
      [targetId, currentUserId]
    );
    res.json({ success: true, status: 'accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
