import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import crypto from 'crypto';
import multer from 'multer';
import { requireAuth } from './auth';
import { getDb } from './db';

const router = express.Router();

const FILES_SALT = process.env.FILES_SALT || 'change-me-in-prod';
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100MB

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FILES_ROOT = path.join(REPO_ROOT, 'cloud', 'files');
const TMP_ROOT = path.join(os.tmpdir(), 'chattify_uploads');

const sha256Hex = (input: string) => crypto.createHash('sha256').update(input).digest('hex');

const buildUserDirHash = async (ownerId: number) => {
  const db = getDb();
  const user = await db.get('SELECT username FROM users WHERE id = ?', [ownerId]);
  const username = user?.username || String(ownerId);
  return sha256Hex(`${username}:${FILES_SALT}`);
};

const upload = multer({
  dest: TMP_ROOT,
  limits: { fileSize: MAX_FILE_BYTES },
});

router.use(requireAuth);

router.post('/upload', upload.single('file'), async (req, res) => {
  const userId = (req as any).userId as number;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) {
    res.status(400).json({ error: 'Missing file' });
    return;
  }

  try {
    await fs.mkdir(FILES_ROOT, { recursive: true });
    await fs.mkdir(TMP_ROOT, { recursive: true });

    const userHash = await buildUserDirHash(userId);
    const userDir = path.join(FILES_ROOT, userHash);
    await fs.mkdir(userDir, { recursive: true });

    const fileHash = sha256Hex(
      `${crypto.randomBytes(32).toString('hex')}:${file.originalname}:${Date.now()}`
    );
    const relPath = path.join(userHash, fileHash);
    const finalPath = path.join(FILES_ROOT, relPath);

    await fs.rename(file.path, finalPath);

    const db = getDb();
    const result = await db.run(
      `INSERT INTO files (owner_id, original_name, mime_type, size_bytes, storage_rel_path, file_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, file.originalname, file.mimetype, file.size, relPath, fileHash]
    );

    const saved = await db.get('SELECT * FROM files WHERE id = ?', [result.lastID]);
    res.json({
      fileId: saved.id,
      originalName: saved.original_name,
      mimeType: saved.mime_type,
      sizeBytes: saved.size_bytes,
    });
  } catch (err: any) {
    // Best-effort cleanup of temp file
    try {
      if (file?.path) await fs.unlink(file.path);
    } catch {}
    res.status(500).json({ error: err?.message || 'Upload failed' });
  }
});

async function canAccessFile(userId: number, fileId: number): Promise<boolean> {
  const db = getDb();
  const owned = await db.get('SELECT 1 FROM files WHERE id = ? AND owner_id = ? LIMIT 1', [
    fileId,
    userId,
  ]);
  if (owned) return true;

  const dm = await db.get(
    `SELECT 1
     FROM message_files mf
     JOIN messages m ON m.id = mf.message_id
     WHERE mf.file_id = ?
       AND (m.sender_id = ? OR m.receiver_id = ?)
     LIMIT 1`,
    [fileId, userId, userId]
  );
  if (dm) return true;

  const group = await db.get(
    `SELECT 1
     FROM group_message_files gmf
     JOIN group_messages gm ON gm.id = gmf.group_message_id
     JOIN group_members mb ON mb.group_id = gm.group_id
     WHERE gmf.file_id = ?
       AND mb.user_id = ?
     LIMIT 1`,
    [fileId, userId]
  );
  return !!group;
}

async function getFileRecord(fileId: number) {
  const db = getDb();
  return db.get('SELECT * FROM files WHERE id = ?', [fileId]);
}

function parseRange(rangeHeader: string | undefined, size: number) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const startStr = match[1];
  const endStr = match[2];

  let start = startStr ? parseInt(startStr, 10) : 0;
  let end = endStr ? parseInt(endStr, 10) : size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null;
  if (start < 0) start = 0;
  if (end >= size) end = size - 1;
  return { start, end };
}

async function streamFile(req: express.Request, res: express.Response, fileId: number, asAttachment: boolean) {
  const userId = (req as any).userId as number;
  const allowed = await canAccessFile(userId, fileId);
  if (!allowed) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const record = await getFileRecord(fileId);
  if (!record) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const absPath = path.join(FILES_ROOT, record.storage_rel_path);
  if (!fsSync.existsSync(absPath)) {
    res.status(404).json({ error: 'File missing on disk' });
    return;
  }

  const stat = await fs.stat(absPath);
  const size = stat.size;
  const range = parseRange(req.headers.range, size);

  res.setHeader('Content-Type', record.mime_type);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader(
    'Content-Disposition',
    `${asAttachment ? 'attachment' : 'inline'}; filename="${encodeURIComponent(record.original_name)}"`
  );

  if (range) {
    const { start, end } = range;
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', String(end - start + 1));
    fsSync.createReadStream(absPath, { start, end }).pipe(res);
    return;
  }

  res.setHeader('Content-Length', String(size));
  fsSync.createReadStream(absPath).pipe(res);
}

router.get('/:fileId', async (req, res) => {
  const fileId = parseInt(req.params.fileId, 10);
  if (Number.isNaN(fileId)) {
    res.status(400).json({ error: 'Invalid fileId' });
    return;
  }
  await streamFile(req, res, fileId, false);
});

router.get('/:fileId/download', async (req, res) => {
  const fileId = parseInt(req.params.fileId, 10);
  if (Number.isNaN(fileId)) {
    res.status(400).json({ error: 'Invalid fileId' });
    return;
  }
  await streamFile(req, res, fileId, true);
});

export default router;

