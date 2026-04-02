import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export const initDb = async () => {
  if (!db) {
    db = await open({
      filename: path.join(__dirname, '../../chat.db'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        storage_rel_path TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(receiver_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS message_files (
        message_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        PRIMARY KEY (message_id, file_id),
        FOREIGN KEY(message_id) REFERENCES messages(id),
        FOREIGN KEY(file_id) REFERENCES files(id)
      );

      CREATE TABLE IF NOT EXISTS friendships (
        requester_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (requester_id, receiver_id),
        FOREIGN KEY(requester_id) REFERENCES users(id),
        FOREIGN KEY(receiver_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        creator_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(creator_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS group_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS group_message_files (
        group_message_id INTEGER NOT NULL,
        file_id INTEGER NOT NULL,
        PRIMARY KEY (group_message_id, file_id),
        FOREIGN KEY(group_message_id) REFERENCES group_messages(id),
        FOREIGN KEY(file_id) REFERENCES files(id)
      );
    `);
    console.log('Database initialized and users table checked.');
  }
  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error("Database not initialized. Call initDb first.");
  }
  return db;
};
