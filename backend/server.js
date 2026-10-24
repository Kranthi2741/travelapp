// backend/server.js
import express from 'express';
import multer from 'multer';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile?.(path.join(__dirname, '.env'));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'travelapp';
const MYSQL_SSL = String(process.env.MYSQL_SSL || '').toLowerCase() === 'true';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const httpError = (status, message) => Object.assign(new Error(message), { status });

const seedDestinations = [
  { id: 1, name: 'Coorg', state: 'Karnataka', category: 'Nature', image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=85', distance: 'Coffee country', note: 'Misty mornings and quiet coffee trails.', lat: 12.3375, lng: 75.8069 },
  { id: 2, name: 'Jog Falls', state: 'Karnataka', category: 'Waterfalls', image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=900&q=85', distance: 'Monsoon favourite', note: 'A dramatic cascade wrapped in green.', lat: 14.229, lng: 74.812 },
  { id: 3, name: 'Ladakh', state: 'Ladakh', category: 'Mountains', image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=85', distance: 'High altitude', note: 'Wide skies, quiet roads, endless horizons.', lat: 34.1526, lng: 77.5771 },
  { id: 4, name: 'Varkala', state: 'Kerala', category: 'Beaches', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85', distance: 'Coastal escape', note: 'Cliffside sunsets and the sound of waves.', lat: 8.7379, lng: 76.7163 },
  { id: 5, name: 'Hampi', state: 'Karnataka', category: 'Heritage', image: 'https://images.unsplash.com/photo-1600100397608-f0107c8a1d1b?auto=format&fit=crop&w=900&q=85', distance: 'Ancient kingdom', note: 'Stone-carved stories across a surreal landscape.', lat: 15.335, lng: 76.46 },
  { id: 6, name: 'Valley of Flowers', state: 'Uttarakhand', category: 'Trekking', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', distance: 'Seasonal trek', note: 'A high-altitude walk through wildflower meadows.', lat: 30.728, lng: 79.605 },
  { id: 7, name: 'Munnar', state: 'Kerala', category: 'Nature', image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=85', distance: 'Tea country', note: 'Rolling tea gardens and misty mountain roads.', lat: 10.0889, lng: 77.0595 },
  { id: 8, name: 'Rishikesh', state: 'Uttarakhand', category: 'Trekking', image: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=85', distance: 'River and foothills', note: 'Riverside walks, forest trails, and mountain air.', lat: 30.0869, lng: 78.2676 },
  { id: 9, name: 'Goa', state: 'Goa', category: 'Beaches', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=85', distance: 'Coastal escape', note: 'Golden beaches, old quarters, and slow evenings.', lat: 15.2993, lng: 74.124 },
  { id: 10, name: 'Jaipur', state: 'Rajasthan', category: 'Heritage', image: 'https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=85', distance: 'Pink City', note: 'Palaces, courtyards, and stories in rose-colored stone.', lat: 26.9124, lng: 75.7873 },
  { id: 11, name: 'Spiti Valley', state: 'Himachal Pradesh', category: 'Mountains', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', distance: 'High desert', note: 'Remote villages and vast Himalayan horizons.', lat: 32.246, lng: 78.034 },
  { id: 12, name: 'Gokarna', state: 'Karnataka', category: 'Beaches', image: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85', distance: 'Quiet coastline', note: 'A slower stretch of coast, coves, and cliff paths.', lat: 14.5479, lng: 74.3188 }
];

const db = {
  users: [],
  destinations: seedDestinations,
  memories: [],
  wishlists: [],
  visits: [],
  achievements: []
};

const mysqlPool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  ...(MYSQL_SSL ? { ssl: { rejectUnauthorized: false } } : {})
});

async function initializeDatabase() {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS states (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE,
      is_union_territory BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS districts (
      id INT AUTO_INCREMENT PRIMARY KEY, state_id INT NOT NULL, name VARCHAR(160) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_district_state (state_id, name),
      FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS places (
      id INT AUTO_INCREMENT PRIMARY KEY, state_id INT NOT NULL, district_id INT NOT NULL,
      name VARCHAR(180) NOT NULL, category VARCHAR(100) NOT NULL DEFAULT '', image TEXT NOT NULL,
      note VARCHAR(600) NOT NULL DEFAULT '', lat DECIMAL(10,7) NULL, lng DECIMAL(10,7) NULL,
      source VARCHAR(255) NOT NULL DEFAULT '', verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_place_district (district_id, name),
      FOREIGN KEY (state_id) REFERENCES states(id) ON DELETE CASCADE,
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS destinations (
      id INT PRIMARY KEY, name VARCHAR(160) NOT NULL, state VARCHAR(120) NOT NULL,
      category VARCHAR(80) NOT NULL, image TEXT NOT NULL, distance VARCHAR(120) NOT NULL,
      note VARCHAR(500) NOT NULL, lat DECIMAL(10,7), lng DECIMAL(10,7)
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY, name VARCHAR(80) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(128) NOT NULL, password_salt VARCHAR(64) NOT NULL,
      phone VARCHAR(32), bio VARCHAR(280) NOT NULL DEFAULT '', avatar VARCHAR(500) NOT NULL DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS memories (
      id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, title VARCHAR(120) NOT NULL, story TEXT NOT NULL,
      place VARCHAR(240) NOT NULL, destination_id INT NULL, directory_key VARCHAR(600), visit_date DATE NOT NULL,
      tags JSON NOT NULL, image_url TEXT NOT NULL, images JSON NOT NULL, image_count INT NOT NULL DEFAULT 0, state VARCHAR(100) NOT NULL,
      district VARCHAR(120) NOT NULL, destination_name VARCHAR(160) NOT NULL, media_type VARCHAR(32) NOT NULL,
      visible_to_friends BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    try { await connection.query('ALTER TABLE memories ADD COLUMN image_count INT NOT NULL DEFAULT 0'); } catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
    try { await connection.query('ALTER TABLE memories ADD COLUMN visible_to_friends BOOLEAN NOT NULL DEFAULT FALSE'); } catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error; }
    await connection.query(`CREATE TABLE IF NOT EXISTS wishlists (
      id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, destination_id INT NULL,
      directory_key VARCHAR(600) NULL, place JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS visits (
      id CHAR(36) PRIMARY KEY, user_id CHAR(36) NOT NULL, destination_id INT NULL,
      directory_key VARCHAR(600) NULL, place JSON NULL, visit_date DATE NOT NULL, memory_id CHAR(36) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS sessions (
      token CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS achievements (
      id VARCHAR(80) PRIMARY KEY, title VARCHAR(160) NOT NULL, description VARCHAR(500) NOT NULL
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS user_achievements (
      user_id CHAR(36) NOT NULL, achievement_id VARCHAR(80) NOT NULL, earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, achievement_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS friend_requests (
      id CHAR(36) PRIMARY KEY, sender_id CHAR(36) NOT NULL, receiver_id CHAR(36) NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_friend_request (sender_id, receiver_id),
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS friendships (
      user_id CHAR(36) NOT NULL, friend_id CHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS memory_friend_shares (
      memory_id CHAR(36) NOT NULL, friend_id CHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (memory_id, friend_id),
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS memory_likes (
      memory_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (memory_id, user_id),
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS memory_comments (
      id CHAR(36) PRIMARY KEY, memory_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
      comment TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS story_views (
      user_id CHAR(36) NOT NULL, story_id VARCHAR(255) NOT NULL,
      seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, story_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    const [destinationRows] = await connection.query('SELECT * FROM destinations ORDER BY id');
    if (!destinationRows.length) {
      await connection.query(
        'INSERT INTO destinations (id,name,state,category,image,distance,note,lat,lng) VALUES ?',
        [seedDestinations.map(d => [d.id, d.name, d.state, d.category, d.image, d.distance, d.note, d.lat, d.lng])]
      );
      db.destinations = [...seedDestinations];
    } else {
      db.destinations = destinationRows.map(d => ({ ...d, lat: Number(d.lat), lng: Number(d.lng) }));
    }
    const [userRows] = await connection.query('SELECT * FROM users ORDER BY created_at');
    db.users = userRows.map(user => ({ id: user.id, name: user.name, email: user.email, hash: user.password_hash, salt: user.password_salt, phone: user.phone || '', bio: user.bio || '', avatar: user.avatar || '', createdAt: user.created_at }));
    console.log(`MySQL connected: ${MYSQL_DATABASE}@${MYSQL_HOST}:${MYSQL_PORT}`);
  } finally {
    connection.release();
  }
}

// The API cache is initialized from MySQL. Individual route writes are kept in
// the cache for this first clean-database cutover; the next persistence pass
// will move each mutation to its normalized table transaction.
function saveDb() {}

const app = express();
app.disable('x-powered-by');

// Express 4 does not catch rejected promises from async route handlers, so a single database hiccup
// could crash the whole server. Wrap every route handler so errors go to the error middleware instead.
for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  const original = app[method].bind(app);
  app[method] = (routePath, ...handlers) => handlers.length
    ? original(routePath, ...handlers.map(handler => (typeof handler === 'function' && handler.length < 4
        ? (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next) : handler)))
    : original(routePath);
}
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const sessions = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex')
  };
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio || '',
    avatar: user.avatar || '',
    createdAt: user.createdAt
  };
}

function issueSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, user.id);
  return token;
}

async function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const userId = sessions.get(token);
  let user = db.users.find(item => item.id === userId);
  if (!user && userId) {
    const [rows] = await mysqlPool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const row = rows[0];
    if (row) {
      user = { id: row.id, name: row.name, email: row.email, hash: row.password_hash, salt: row.password_salt, phone: row.phone || '', bio: row.bio || '', avatar: row.avatar || '', createdAt: row.created_at };
      db.users.push(user);
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Please sign in again.' });
  }

  req.user = user;
  next();
}

async function userForEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const cached = db.users.find(
    user => user.email.toLowerCase() === String(email || '').trim().toLowerCase()
  );
  if (cached) return cached;
  const [rows] = await mysqlPool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
  const row = rows[0];
  if (!row) return null;
  const user = { id: row.id, name: row.name, email: row.email, hash: row.password_hash, salt: row.password_salt, phone: row.phone || '', bio: row.bio || '', avatar: row.avatar || '', createdAt: row.created_at };
  db.users.push(user);
  return user;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'delusional-diary-api', version: '1.0.0' });
});

// Demo login
app.post('/api/auth/demo', async (_req, res) => {
  let user = await userForEmail('explorer@delusionaldiary.local');

  if (!user) {
    user = {
      id: crypto.randomUUID(),
      name: 'Delusional Soul',
      email: 'explorer@delusionaldiary.local',
      ...hashPassword(crypto.randomBytes(24).toString('hex')),
      bio: '',
      avatar: '',
      createdAt: new Date().toISOString()
    };

    await mysqlPool.query('INSERT INTO users (id,name,email,password_hash,password_salt,bio,avatar) VALUES (?,?,?,?,?,?,?)', [user.id, user.name, user.email, user.hash, user.salt, user.bio, user.avatar]);
    db.users.push(user);
  }

  res.json({ token: issueSession(user), user: safeUser(user) });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    !String(name || '').trim() ||
    !/^\S+@\S+\.\S+$/.test(String(email || '')) ||
    String(password || '').length < 8
  ) {
    return res.status(400).json({
      error: 'Enter a name, valid email, and password of at least 8 characters.'
    });
  }

  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (await userForEmail(normalizedEmail)) {
    return res.status(409).json({ error: 'This email is already registered. Please use another email.' });
  }
  const [nameRows] = await mysqlPool.query('SELECT id FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1', [normalizedName]);
  if (nameRows[0]) {
    return res.status(409).json({ error: 'This name is already in use. Please choose another name.' });
  }

  const user = {
    id: crypto.randomUUID(),
    name: normalizedName.slice(0, 80),
    email: normalizedEmail,
    ...hashPassword(password),
    bio: '',
    avatar: '',
    createdAt: new Date().toISOString()
  };

  await mysqlPool.query('INSERT INTO users (id,name,email,password_hash,password_salt,bio,avatar) VALUES (?,?,?,?,?,?,?)', [user.id, user.name, user.email, user.hash, user.salt, user.bio, user.avatar]);
  db.users.push(user);

  res.status(201).json({ token: issueSession(user), user: safeUser(user) });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const user = await userForEmail(req.body?.email);

  if (!user) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  const passwordData = hashPassword(String(req.body?.password || ''), user.salt);

  if (passwordData.hash !== user.hash) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }

  res.json({ token: issueSession(user), user: safeUser(user) });
});

// Logout
app.post('/api/auth/logout', auth, (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  sessions.delete(token);
  res.json({ ok: true });
});

// User profile
app.get('/api/me', auth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

const AVATAR_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Saves profile changes to MySQL (they used to live only in memory, so they vanished on restart
// and friends could never see them). Uploaded photos are stored as files, not as huge database values.
app.patch('/api/me', auth, async (req, res) => {
  const { name, bio, avatar } = req.body || {};
  const changes = {};

  if (name !== undefined) {
    const clean = String(name).trim().slice(0, 80);
    if (!clean) throw httpError(400, 'Enter a name.');
    const [taken] = await mysqlPool.query('SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id <> ?', [clean, req.user.id]);
    if (taken[0]) throw httpError(409, 'This name is already in use. Please choose another name.');
    changes.name = clean;
  }
  if (bio !== undefined) changes.bio = String(bio).trim().slice(0, 280);

  if (avatar !== undefined) {
    const value = String(avatar);
    const dataUrl = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (dataUrl) {
      const bytes = Buffer.from(dataUrl[2], 'base64');
      if (bytes.length > 1.5 * 1024 * 1024) throw httpError(400, 'That photo is too large. Please choose a smaller one.');
      const fileName = `avatar-${req.user.id}-${Date.now()}.${AVATAR_TYPES[dataUrl[1]]}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), bytes);
      changes.avatar = `/uploads/${fileName}`;
    } else if (/^(https?:\/\/|\/uploads\/)/.test(value) && value.length <= 500) changes.avatar = value;
    else if (value === '') changes.avatar = '';
    else throw httpError(400, 'Use an uploaded photo or a link that starts with https://.');
  }

  const columns = Object.keys(changes);
  if (columns.length) {
    const previousAvatar = req.user.avatar || '';
    await mysqlPool.query(`UPDATE users SET ${columns.map(column => `${column} = ?`).join(', ')} WHERE id = ?`, [...columns.map(column => changes[column]), req.user.id]);
    Object.assign(req.user, changes);
    // Tidy up the previous uploaded photo of this user.
    if (changes.avatar !== undefined && previousAvatar.startsWith(`/uploads/avatar-${req.user.id}-`) && previousAvatar !== changes.avatar) {
      fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(previousAvatar))).catch(() => undefined);
    }
  }
  res.json({ user: safeUser(req.user) });
});

// ======================================================================
// Social graph: friends, requests, shared diary, likes and comments
// ======================================================================
// A memory earns its passport stamp this many seconds after it was uploaded.
const STAMP_DELAY_SECONDS = 300;
const REJECT_COOLDOWN_DAYS = 7;
const MAX_PENDING_OUTGOING = 100;
const escapeLike = value => value.replace(/[\\%_]/g, match => `\\${match}`);
const parseJson = (value, fallback) => { try { return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback); } catch { return fallback; } };

// SQL snippets (each placeholder count is noted so parameters stay in order)
const REL_SQL = `CASE
  WHEN EXISTS (SELECT 1 FROM friendships f WHERE f.user_id = ? AND f.friend_id = u.id) THEN 'friends'
  WHEN EXISTS (SELECT 1 FROM friend_requests r WHERE r.sender_id = ? AND r.receiver_id = u.id AND r.status = 'pending') THEN 'sent'
  WHEN EXISTS (SELECT 1 FROM friend_requests r WHERE r.sender_id = u.id AND r.receiver_id = ? AND r.status = 'pending') THEN 'received'
  ELSE 'none' END`; // 3 placeholders
const REQ_SQL = `(SELECT r.id FROM friend_requests r WHERE r.status = 'pending'
  AND ((r.sender_id = ? AND r.receiver_id = u.id) OR (r.sender_id = u.id AND r.receiver_id = ?)) LIMIT 1)`; // 2 placeholders
const MUTUAL_SQL = `(SELECT COUNT(*) FROM friendships a JOIN friendships b ON a.friend_id = b.friend_id WHERE a.user_id = ? AND b.user_id = u.id)`; // 1 placeholder
const SHARED_WITH_ME_SQL = `m.visible_to_friends = TRUE
  AND EXISTS (SELECT 1 FROM memory_friend_shares s WHERE s.memory_id = m.id AND s.friend_id = ?)
  AND EXISTS (SELECT 1 FROM friendships fr WHERE fr.user_id = ? AND fr.friend_id = m.user_id)`; // 2 placeholders

const publicUser = row => ({ id: row.id, name: row.name, avatar: row.avatar || '', bio: row.bio || '' });

async function areFriends(userId, otherId) {
  const [rows] = await mysqlPool.query('SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?', [userId, otherId]);
  return Boolean(rows[0]);
}

/** A memory can be seen/liked/commented on by its owner, or by a current friend it was shared with. */
async function canViewMemory(memoryId, userId) {
  const [rows] = await mysqlPool.query(
    `SELECT m.id, m.user_id FROM memories m WHERE m.id = ? AND (m.user_id = ? OR (${SHARED_WITH_ME_SQL}))`,
    [memoryId, userId, userId, userId]);
  return rows[0] || null;
}

function mapFeedMemory(row) {
  const images = parseJson(row.images, []);
  return {
    id: row.id, userId: row.user_id, title: row.title, story: row.story, place: row.place,
    state: row.state, district: row.district, destinationName: row.destination_name, visitDate: row.visit_date,
    imageUrl: row.image_url, images: Array.isArray(images) && images.length ? images : [row.image_url].filter(Boolean),
    createdAt: row.created_at, stampIn: Number(row.stamp_in || 0),
    author: { id: row.user_id, name: row.author_name, avatar: row.author_avatar || '' },
    likeCount: Number(row.like_count || 0), liked: Boolean(Number(row.liked)), commentCount: Number(row.comment_count || 0)
  };
}

const FEED_SELECT = `SELECT m.*, u.name AS author_name, u.avatar AS author_avatar,
  GREATEST(0, ${STAMP_DELAY_SECONDS} - TIMESTAMPDIFF(SECOND, m.created_at, NOW())) AS stamp_in,
  (SELECT COUNT(*) FROM memory_likes l WHERE l.memory_id = m.id) AS like_count,
  EXISTS(SELECT 1 FROM memory_likes l WHERE l.memory_id = m.id AND l.user_id = ?) AS liked,
  (SELECT COUNT(*) FROM memory_comments c WHERE c.memory_id = m.id) AS comment_count
  FROM memories m JOIN users u ON u.id = m.user_id`; // 1 placeholder

async function acceptRequest(requestId, senderId, receiverId) {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE friend_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [requestId]);
    await connection.query('INSERT IGNORE INTO friendships (user_id,friend_id) VALUES (?,?),(?,?)', [senderId, receiverId, receiverId, senderId]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

// ---- Find people ----------------------------------------------------
// Search by name (partial) or by exact email. Never lists everyone, and never returns email addresses.
app.get('/api/users/search', auth, async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return res.json({ users: [] });
  const me = req.user.id;
  const [rows] = await mysqlPool.query(
    `SELECT u.id, u.name, u.avatar, u.bio, ${REL_SQL} AS relationship, ${REQ_SQL} AS requestId, ${MUTUAL_SQL} AS mutualCount
     FROM users u WHERE u.id <> ? AND (u.name LIKE ? OR u.email = ?)
     ORDER BY (u.name LIKE ?) DESC, u.name LIMIT 20`,
    [me, me, me, me, me, me, me, `%${escapeLike(q)}%`, q.toLowerCase(), `${escapeLike(q)}%`]);
  res.json({ users: rows.map(row => ({ ...publicUser(row), relationship: row.relationship, requestId: row.requestId || null, mutualCount: Number(row.mutualCount) })) });
});

// Legacy endpoint kept for the memory-sharing picker: returns friends only (no enumeration of all users).
app.get('/api/users', auth, async (req, res) => {
  const [rows] = await mysqlPool.query(
    `SELECT u.id, u.name, u.avatar, 'friends' AS relationship FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY u.name`, [req.user.id]);
  res.json({ users: rows });
});

app.get('/api/friends/suggestions', auth, async (req, res) => {
  const me = req.user.id;
  const [rows] = await mysqlPool.query(
    `SELECT u.id, u.name, u.avatar, u.bio, COUNT(*) AS mutualCount
     FROM friendships a JOIN friendships b ON b.user_id = a.friend_id JOIN users u ON u.id = b.friend_id
     WHERE a.user_id = ? AND u.id <> ?
       AND NOT EXISTS (SELECT 1 FROM friendships x WHERE x.user_id = ? AND x.friend_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM friend_requests r WHERE r.status = 'pending' AND ((r.sender_id = ? AND r.receiver_id = u.id) OR (r.sender_id = u.id AND r.receiver_id = ?)))
     GROUP BY u.id, u.name, u.avatar, u.bio ORDER BY mutualCount DESC, u.name LIMIT 8`,
    [me, me, me, me, me]);
  res.json({ users: rows.map(row => ({ ...publicUser(row), relationship: 'none', requestId: null, mutualCount: Number(row.mutualCount) })) });
});

app.get('/api/friends/summary', auth, async (req, res) => {
  const me = req.user.id;
  const [[incoming]] = await mysqlPool.query("SELECT COUNT(*) AS n FROM friend_requests WHERE receiver_id = ? AND status = 'pending'", [me]);
  const [[friends]] = await mysqlPool.query('SELECT COUNT(*) AS n FROM friendships WHERE user_id = ?', [me]);
  const [[shared]] = await mysqlPool.query(`SELECT COUNT(*) AS n FROM memories m WHERE ${SHARED_WITH_ME_SQL}`, [me, me]);
  res.json({ incoming: incoming.n, friends: friends.n, sharedMemories: shared.n });
});

// ---- Friends list -----------------------------------------------------
app.get('/api/friends', auth, async (req, res) => {
  const me = req.user.id;
  const [rows] = await mysqlPool.query(
    `SELECT u.id, u.name, u.avatar, u.bio, f.created_at AS friendsSince, ${MUTUAL_SQL} AS mutualCount,
       (SELECT COUNT(*) FROM memories m WHERE m.user_id = u.id AND m.visible_to_friends = TRUE
          AND EXISTS (SELECT 1 FROM memory_friend_shares s WHERE s.memory_id = m.id AND s.friend_id = ?)) AS sharedCount
     FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY u.name`, [me, me, me]);
  res.json({ friends: rows.map(row => ({ ...publicUser(row), friendsSince: row.friendsSince, mutualCount: Number(row.mutualCount), sharedCount: Number(row.sharedCount) })) });
});

// Shared diary feed (memories friends chose to share with me)
app.get('/api/friends/memories', auth, async (req, res) => {
  const me = req.user.id;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const friendId = req.query.friendId ? String(req.query.friendId) : null;
  const [rows] = await mysqlPool.query(
    `${FEED_SELECT} WHERE ${SHARED_WITH_ME_SQL} ${friendId ? 'AND m.user_id = ?' : ''}
     ORDER BY m.created_at DESC, m.id LIMIT ? OFFSET ?`,
    [me, me, me, ...(friendId ? [friendId] : []), limit + 1, offset]);
  res.json({ memories: rows.slice(0, limit).map(mapFeedMemory), hasMore: rows.length > limit });
});

app.get('/api/friends/:friendId', auth, async (req, res) => {
  const me = req.user.id, friendId = String(req.params.friendId);
  const [rows] = await mysqlPool.query(
    `SELECT u.id, u.name, u.avatar, u.bio, u.created_at AS joinedAt, f.created_at AS friendsSince, ${MUTUAL_SQL} AS mutualCount
     FROM friendships f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.friend_id = ?`, [me, me, friendId]);
  if (!rows[0]) throw httpError(404, 'This person is not in your friends list.');
  const [memories] = await mysqlPool.query(
    `${FEED_SELECT} WHERE ${SHARED_WITH_ME_SQL} AND m.user_id = ? ORDER BY m.created_at DESC LIMIT 60`, [me, me, me, friendId]);
  res.json({ friend: { ...publicUser(rows[0]), joinedAt: rows[0].joinedAt, friendsSince: rows[0].friendsSince, mutualCount: Number(rows[0].mutualCount), sharedCount: memories.length }, memories: memories.map(mapFeedMemory) });
});

app.delete('/api/friends/:friendId', auth, async (req, res) => {
  const me = req.user.id, friendId = String(req.params.friendId);
  if (!(await areFriends(me, friendId))) throw httpError(404, 'This person is not in your friends list.');
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [me, friendId, friendId, me]);
    await connection.query('DELETE FROM friend_requests WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)', [me, friendId, friendId, me]);
    // Remove everything that depended on the friendship so private memories stay private afterwards.
    await connection.query('DELETE s FROM memory_friend_shares s JOIN memories m ON m.id = s.memory_id WHERE (m.user_id = ? AND s.friend_id = ?) OR (m.user_id = ? AND s.friend_id = ?)', [me, friendId, friendId, me]);
    await connection.query('DELETE l FROM memory_likes l JOIN memories m ON m.id = l.memory_id WHERE (m.user_id = ? AND l.user_id = ?) OR (m.user_id = ? AND l.user_id = ?)', [me, friendId, friendId, me]);
    await connection.query('DELETE c FROM memory_comments c JOIN memories m ON m.id = c.memory_id WHERE (m.user_id = ? AND c.user_id = ?) OR (m.user_id = ? AND c.user_id = ?)', [me, friendId, friendId, me]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  res.json({ ok: true });
});

// ---- Friend requests --------------------------------------------------
app.get('/api/friend-requests', auth, async (req, res) => {
  const me = req.user.id;
  const [incoming] = await mysqlPool.query(
    `SELECT r.id, r.sender_id AS senderId, u.name, u.avatar, u.bio, r.created_at AS createdAt, ${MUTUAL_SQL} AS mutualCount
     FROM friend_requests r JOIN users u ON u.id = r.sender_id WHERE r.receiver_id = ? AND r.status = 'pending' ORDER BY r.created_at DESC`, [me, me]);
  const [outgoing] = await mysqlPool.query(
    `SELECT r.id, r.receiver_id AS receiverId, u.name, u.avatar, u.bio, r.created_at AS createdAt
     FROM friend_requests r JOIN users u ON u.id = r.receiver_id WHERE r.sender_id = ? AND r.status = 'pending' ORDER BY r.created_at DESC`, [me]);
  res.json({ incoming: incoming.map(row => ({ ...row, avatar: row.avatar || '', mutualCount: Number(row.mutualCount) })), outgoing: outgoing.map(row => ({ ...row, avatar: row.avatar || '' })) });
});

app.post('/api/friend-requests/:userId', auth, async (req, res) => {
  const me = req.user.id, targetId = String(req.params.userId);
  if (targetId === me) throw httpError(400, 'You cannot send a friend request to yourself.');
  const [target] = await mysqlPool.query('SELECT id FROM users WHERE id = ?', [targetId]);
  if (!target[0]) throw httpError(404, 'User not found.');
  if (await areFriends(me, targetId)) throw httpError(409, 'You are already friends.');

  // They already asked me: sending a request back simply accepts theirs.
  const [reverse] = await mysqlPool.query("SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'", [targetId, me]);
  if (reverse[0]) { await acceptRequest(reverse[0].id, targetId, me); return res.json({ ok: true, status: 'friends' }); }

  const [existing] = await mysqlPool.query(
    'SELECT status, TIMESTAMPDIFF(DAY, COALESCE(updated_at, created_at), NOW()) AS ageDays FROM friend_requests WHERE sender_id = ? AND receiver_id = ?', [me, targetId]);
  if (existing[0]?.status === 'pending') throw httpError(409, 'You already sent a request to this person.');
  if (existing[0]?.status === 'rejected' && Number(existing[0].ageDays) < REJECT_COOLDOWN_DAYS) throw httpError(429, 'You can send this person another request later.');
  const [[pending]] = await mysqlPool.query("SELECT COUNT(*) AS n FROM friend_requests WHERE sender_id = ? AND status = 'pending'", [me]);
  if (pending.n >= MAX_PENDING_OUTGOING) throw httpError(429, 'You have too many pending requests. Cancel a few first.');

  await mysqlPool.query(
    `INSERT INTO friend_requests (id,sender_id,receiver_id,status) VALUES (?,?,?,'pending')
     ON DUPLICATE KEY UPDATE status = 'pending', created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`, [crypto.randomUUID(), me, targetId]);
  res.status(201).json({ ok: true, status: 'sent' });
});

app.patch('/api/friend-requests/:requestId', auth, async (req, res) => {
  const status = req.body?.status;
  if (!['accepted', 'rejected'].includes(status)) throw httpError(400, 'Choose accepted or rejected.');
  const [rows] = await mysqlPool.query("SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = 'pending'", [req.params.requestId, req.user.id]);
  const request = rows[0];
  if (!request) throw httpError(404, 'Friend request not found.');
  if (status === 'accepted') await acceptRequest(request.id, request.sender_id, request.receiver_id);
  else await mysqlPool.query("UPDATE friend_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [request.id]);
  res.json({ ok: true, status });
});

// Sender takes back a pending request
app.delete('/api/friend-requests/:requestId', auth, async (req, res) => {
  const [result] = await mysqlPool.query("DELETE FROM friend_requests WHERE id = ? AND sender_id = ? AND status = 'pending'", [req.params.requestId, req.user.id]);
  if (!result.affectedRows) throw httpError(404, 'Friend request not found.');
  res.json({ ok: true });
});

// ---- Likes, comments and sharing --------------------------------------
app.post('/api/memories/:id/like', auth, async (req, res) => {
  if (!(await canViewMemory(req.params.id, req.user.id))) throw httpError(403, 'You can only like memories that were shared with you.');
  const [existing] = await mysqlPool.query('SELECT 1 FROM memory_likes WHERE memory_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (existing[0]) await mysqlPool.query('DELETE FROM memory_likes WHERE memory_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  else await mysqlPool.query('INSERT IGNORE INTO memory_likes (memory_id,user_id) VALUES (?,?)', [req.params.id, req.user.id]);
  const [[count]] = await mysqlPool.query('SELECT COUNT(*) AS count FROM memory_likes WHERE memory_id = ?', [req.params.id]);
  res.json({ liked: !existing[0], count: count.count });
});

app.get('/api/memories/:id/comments', auth, async (req, res) => {
  if (!(await canViewMemory(req.params.id, req.user.id))) throw httpError(403, 'This memory is not shared with you.');
  const [rows] = await mysqlPool.query(
    `SELECT c.id, c.comment, c.created_at AS createdAt, u.id AS userId, u.name, u.avatar
     FROM memory_comments c JOIN users u ON u.id = c.user_id WHERE c.memory_id = ? ORDER BY c.created_at ASC LIMIT 200`, [req.params.id]);
  res.json({ comments: rows.map(row => ({ id: row.id, comment: row.comment, createdAt: row.createdAt, author: { id: row.userId, name: row.name, avatar: row.avatar || '' }, mine: row.userId === req.user.id })) });
});

app.post('/api/memories/:id/comments', auth, async (req, res) => {
  const text = String(req.body?.comment || '').trim();
  if (!text || text.length > 1000) throw httpError(400, 'Enter a comment up to 1000 characters.');
  if (!(await canViewMemory(req.params.id, req.user.id))) throw httpError(403, 'You can only comment on memories that were shared with you.');
  const id = crypto.randomUUID();
  await mysqlPool.query('INSERT INTO memory_comments (id,memory_id,user_id,comment) VALUES (?,?,?,?)', [id, req.params.id, req.user.id, text]);
  res.status(201).json({ comment: { id, comment: text, createdAt: new Date().toISOString(), author: { id: req.user.id, name: req.user.name, avatar: req.user.avatar || '' }, mine: true } });
});

app.delete('/api/comments/:id', auth, async (req, res) => {
  const [result] = await mysqlPool.query(
    'DELETE c FROM memory_comments c JOIN memories m ON m.id = c.memory_id WHERE c.id = ? AND (c.user_id = ? OR m.user_id = ?)', [req.params.id, req.user.id, req.user.id]);
  if (!result.affectedRows) throw httpError(404, 'Comment not found.');
  res.json({ ok: true });
});

app.get('/api/story-views', auth, async (req, res) => {
  const [rows] = await mysqlPool.query('SELECT story_id AS storyId FROM story_views WHERE user_id = ?', [req.user.id]);
  res.json({ storyIds: rows.map(row => row.storyId) });
});

app.post('/api/story-views/:storyId', auth, async (req, res) => {
  const storyId = String(req.params.storyId || '').slice(0, 255);
  if (!storyId) throw httpError(400, 'Story id is required.');
  await mysqlPool.query('INSERT INTO story_views (user_id, story_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE seen_at = CURRENT_TIMESTAMP', [req.user.id, storyId]);
  res.json({ ok: true });
});

// Choose which friends can see one of my memories (can be changed any time)
app.get('/api/memories/:id/sharing', auth, async (req, res) => {
  const [memory] = await mysqlPool.query('SELECT visible_to_friends FROM memories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!memory[0]) throw httpError(404, 'Memory not found.');
  const [shares] = await mysqlPool.query('SELECT friend_id FROM memory_friend_shares WHERE memory_id = ?', [req.params.id]);
  res.json({ visibleToFriends: Boolean(memory[0].visible_to_friends), friendIds: shares.map(row => row.friend_id) });
});

app.patch('/api/memories/:id/sharing', auth, async (req, res) => {
  const me = req.user.id;
  const [memory] = await mysqlPool.query('SELECT id FROM memories WHERE id = ? AND user_id = ?', [req.params.id, me]);
  if (!memory[0]) throw httpError(404, 'Memory not found.');
  let ids = req.body?.all ? null : [...new Set((Array.isArray(req.body?.friendIds) ? req.body.friendIds : []).map(String))].slice(0, 500);
  const [friends] = ids === null
    ? await mysqlPool.query('SELECT friend_id FROM friendships WHERE user_id = ?', [me])
    : ids.length ? await mysqlPool.query('SELECT friend_id FROM friendships WHERE user_id = ? AND friend_id IN (?)', [me, ids]) : [[]];
  const allowed = friends.map(row => row.friend_id);
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM memory_friend_shares WHERE memory_id = ?', [req.params.id]);
    if (allowed.length) await connection.query('INSERT INTO memory_friend_shares (memory_id, friend_id) VALUES ?', [allowed.map(friendId => [req.params.id, friendId])]);
    await connection.query('UPDATE memories SET visible_to_friends = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [allowed.length > 0, req.params.id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  res.json({ ok: true, visibleToFriends: allowed.length > 0, friendIds: allowed });
});

// India directory
app.get('/api/directory', async (_req, res) => {
  const [states] = await mysqlPool.query('SELECT id, name, is_union_territory FROM states ORDER BY name');
  const [districts] = await mysqlPool.query('SELECT id, state_id, name FROM districts ORDER BY name');
  const [places] = await mysqlPool.query('SELECT district_id, name, category, image, note, lat, lng, source, verified FROM places ORDER BY name');
  res.json(states.map(state => ({
    name: state.name,
    isUnionTerritory: Boolean(state.is_union_territory),
    districts: districts.filter(district => district.state_id === state.id).map(district => district.name),
    places: places.filter(place => districts.some(district => district.id === place.district_id && district.state_id === state.id)).map(place => {
      const district = districts.find(item => item.id === place.district_id);
      return { name: place.name, district: district?.name || '', category: place.category, image: place.image, note: place.note, lat: place.lat == null ? undefined : Number(place.lat), lng: place.lng == null ? undefined : Number(place.lng), source: place.source, verified: Boolean(place.verified) };
    })
  })));
});

// Catalogue destinations
app.get('/api/destinations', (req, res) => {
  let items = [...db.destinations];
  const query = String(req.query.q || '').toLowerCase();
  const category = String(req.query.category || '');
  const state = String(req.query.state || '');

  if (query) {
    items = items.filter(destination =>
      `${destination.name} ${destination.state} ${destination.category} ${destination.note}`
        .toLowerCase().includes(query)
    );
  }

  if (category && category !== 'All') {
    items = items.filter(destination => destination.category === category);
  }

  if (state) items = items.filter(destination => destination.state === state);

  res.json({
    destinations: items,
    states: [...new Set(db.destinations.map(d => d.state))].sort(),
    categories: [...new Set(db.destinations.map(d => d.category))].sort()
  });
});

app.get('/api/destinations/:id', (req, res) => {
  const destination = db.destinations.find(d => d.id === Number(req.params.id));

  if (!destination) return res.status(404).json({ error: 'Destination not found.' });

  res.json({ destination });
});

// Photo and media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|wav|webm|mp4))$/
        .test(file.mimetype);

    if (!allowed) return cb(new Error('Only image, video, and audio files are allowed.'));
    cb(null, true);
  }
});

app.post('/api/uploads', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });

  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size
  });
});

// List diary memories
app.get('/api/memories', auth, async (req, res) => {
  const query = String(req.query.q || '').toLowerCase();
  const [rows] = await mysqlPool.query(`SELECT *, GREATEST(0, ${STAMP_DELAY_SECONDS} - TIMESTAMPDIFF(SECOND, created_at, NOW())) AS stamp_in FROM memories WHERE user_id = ? ORDER BY created_at DESC`, [req.user.id]);
  let memories = rows.map(memory => ({
    id: memory.id, userId: memory.user_id, title: memory.title, story: memory.story, place: memory.place,
    destinationId: memory.destination_id, directoryKey: memory.directory_key, visitDate: memory.visit_date,
    tags: typeof memory.tags === 'string' ? JSON.parse(memory.tags) : memory.tags,
    imageUrl: memory.image_url, images: typeof memory.images === 'string' ? JSON.parse(memory.images) : memory.images, imageCount: memory.image_count,
    state: memory.state, district: memory.district, destinationName: memory.destination_name,
    mediaType: memory.media_type, createdAt: memory.created_at, updatedAt: memory.updated_at,
    stampIn: Number(memory.stamp_in || 0)
  }));
  if (query) memories = memories.filter(memory => `${memory.title} ${memory.place} ${memory.story} ${(memory.tags || []).join(' ')}`.toLowerCase().includes(query));
  res.json({ memories });
});

// Create memory and update visit history
app.post('/api/memories', auth, async (req, res) => {
  const {
    title,
    story = '',
    place = '',
    destinationId = null,
    directoryKey = null,
    visitDate,
    tags = [],
    imageUrl = '',
    images = [],
    mediaType = 'image',
    visibleToFriends = false,
    sharedWithFriendIds = [],
    state = '',
    district = '',
    destinationName = ''
  } = req.body || {};

  if (!String(title || '').trim()) {
    return res.status(400).json({ error: 'Memory title is required.' });
  }

  if (Array.isArray(images) && images.length > 12) {
    return res.status(400).json({ error: 'A memory album can contain up to 12 photos.' });
  }

  const destination = db.destinations.find(d => d.id === Number(destinationId));

  const cleanImages = Array.isArray(images)
    ? images.map(image => String(image).slice(0, 2000)).filter(Boolean).slice(0, 12)
    : [];

  const primaryImage = String(
    imageUrl || cleanImages[0] || destination?.image || ''
  ).slice(0, 2000);

  const memory = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    title: String(title).trim().slice(0, 120),
    story: String(story).slice(0, 5000),
    place: String(place || destination?.name || 'Somewhere worth remembering').slice(0, 240),
    destinationId: destination?.id || null,
    directoryKey: directoryKey ? String(directoryKey).slice(0, 600) : null,
    visitDate: visitDate || new Date().toISOString().slice(0, 10),
    tags: Array.isArray(tags) ? tags.map(String).slice(0, 12) : [],
    imageUrl: primaryImage,
    images: cleanImages.length ? cleanImages : (primaryImage ? [primaryImage] : []),
    state: String(state || destination?.state || '').slice(0, 100),
    district: String(district || '').slice(0, 120),
    destinationName: String(destinationName || destination?.name || '').slice(0, 160),
    mediaType: String(mediaType || 'image'),
    createdAt: new Date().toISOString(),
    stampIn: STAMP_DELAY_SECONDS
  };

  await mysqlPool.query(
    'INSERT INTO memories (id,user_id,title,story,place,destination_id,directory_key,visit_date,tags,image_url,images,image_count,state,district,destination_name,media_type,visible_to_friends) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [memory.id, memory.userId, memory.title, memory.story, memory.place, memory.destinationId, memory.directoryKey, memory.visitDate, JSON.stringify(memory.tags), memory.imageUrl, JSON.stringify(memory.images), memory.images.length, memory.state, memory.district, memory.destinationName, memory.mediaType, Boolean(visibleToFriends)]
  );
  if (Boolean(visibleToFriends) && Array.isArray(sharedWithFriendIds) && sharedWithFriendIds.length) {
    const ids = [...new Set(sharedWithFriendIds.map(String))].slice(0, 100);
    const [friends] = await mysqlPool.query('SELECT friend_id FROM friendships WHERE user_id = ? AND friend_id IN (?)', [req.user.id, ids]);
    if (friends.length) await mysqlPool.query('INSERT INTO memory_friend_shares (memory_id, friend_id) VALUES ?', [friends.map(friend => [memory.id, friend.friend_id])]);
  }
  db.memories.push(memory);

  // Directory attraction memory means the user visited that place.
  if (memory.directoryKey) {
    const existingVisit = db.visits.find(visit =>
      visit.userId === req.user.id &&
      visit.directoryKey === memory.directoryKey &&
      visit.visitDate === memory.visitDate
    );

    if (!existingVisit) {
      db.visits.push({
        id: crypto.randomUUID(),
        userId: req.user.id,
        directoryKey: memory.directoryKey,
        place: {
          key: memory.directoryKey,
          name: memory.destinationName || memory.place,
          state: memory.state,
          district: memory.district,
          image: memory.imageUrl
        },
        visitDate: memory.visitDate,
        memoryId: memory.id,
        createdAt: new Date().toISOString()
      });
    } else if (!existingVisit.memoryId) {
      existingVisit.memoryId = memory.id;
    }
  }

  if (
    destination &&
    !db.visits.some(visit =>
      visit.userId === req.user.id && visit.destinationId === destination.id
    )
  ) {
    db.visits.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      destinationId: destination.id,
      visitDate: memory.visitDate,
      memoryId: memory.id,
      createdAt: new Date().toISOString()
    });
  }

  saveDb();
  res.status(201).json({ memory });
});

// Edit memory
app.patch('/api/memories/:id', auth, (req, res) => {
  const memory = db.memories.find(
    item => item.id === req.params.id && item.userId === req.user.id
  );

  if (!memory) return res.status(404).json({ error: 'Memory not found.' });

  for (const field of [
    'title', 'story', 'place', 'visitDate', 'imageUrl',
    'mediaType', 'state', 'district', 'destinationName'
  ]) {
    if (req.body?.[field] !== undefined) {
      memory[field] = String(req.body[field]).slice(0, field === 'story' ? 5000 : 1000);
    }
  }

  if (Array.isArray(req.body?.images)) {
    memory.images = req.body.images.map(String).slice(0, 12);
  }

  if (Array.isArray(req.body?.tags)) {
    memory.tags = req.body.tags.map(String).slice(0, 12);
  }

  memory.updatedAt = new Date().toISOString();
  saveDb();
  res.json({ memory });
});

// Delete a MySQL memory owned by the signed-in user.
app.delete('/api/memories/:id', auth, async (req, res) => {
  const [owned] = await mysqlPool.query('SELECT id FROM memories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!owned[0]) return res.status(404).json({ error: 'Memory not found.' });

  await mysqlPool.query('DELETE FROM memory_likes WHERE memory_id = ?', [req.params.id]);
  await mysqlPool.query('DELETE FROM memory_comments WHERE memory_id = ?', [req.params.id]);
  await mysqlPool.query('DELETE FROM visits WHERE memory_id = ? AND user_id = ?', [req.params.id, req.user.id]);
  await mysqlPool.query('DELETE FROM memories WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// Get wishlist
app.get('/api/wishlist', auth, async (req, res) => {
  const [entries] = await mysqlPool.query('SELECT destination_id AS destinationId, directory_key AS directoryKey, place FROM wishlists WHERE user_id = ?', [req.user.id]);
  const parsedEntries = entries.map(item => ({ ...item, place: typeof item.place === 'string' ? JSON.parse(item.place) : item.place }));

  res.json({
    destinationIds: parsedEntries.filter(item => item.destinationId != null).map(item => item.destinationId),
    directoryKeys: parsedEntries.filter(item => item.directoryKey).map(item => item.directoryKey),
    directoryPlaces: parsedEntries.filter(item => item.directoryKey).map(item => item.place).filter(Boolean)
  });
});

// Toggle directory attraction heart
app.post('/api/wishlist/directory', auth, async (req, res) => {
  const key = String(req.body?.key || '').trim();
  const place = req.body?.place || {};

  if (!key || key.length > 600) {
    return res.status(400).json({ error: 'A valid directory place key is required.' });
  }

  const [existingRows] = await mysqlPool.query('SELECT id FROM wishlists WHERE user_id = ? AND directory_key = ? LIMIT 1', [req.user.id, key]);

  if (existingRows[0]) {
    await mysqlPool.query('DELETE FROM wishlists WHERE id = ?', [existingRows[0].id]);
  } else {
    const placeData = {
        key,
        name: String(place.name || '').slice(0, 180),
        state: String(place.state || '').slice(0, 100),
        district: String(place.district || '').slice(0, 120),
        category: String(place.category || '').slice(0, 80),
        image: String(place.image || '').slice(0, 2000),
        note: String(place.note || '').slice(0, 500),
        lat: Number.isFinite(Number(place.lat)) ? Number(place.lat) : null,
        lng: Number.isFinite(Number(place.lng)) ? Number(place.lng) : null
      };
    await mysqlPool.query('INSERT INTO wishlists (id,user_id,directory_key,place) VALUES (?,?,?,?)', [crypto.randomUUID(), req.user.id, key, JSON.stringify(placeData)]);
  }

  const [entries] = await mysqlPool.query('SELECT destination_id AS destinationId, directory_key AS directoryKey FROM wishlists WHERE user_id = ?', [req.user.id]);

  res.json({
    destinationIds: entries.filter(item => item.destinationId != null).map(item => item.destinationId),
    directoryKeys: entries.filter(item => item.directoryKey).map(item => item.directoryKey)
  });
});

// Toggle catalogue destination wishlist
app.post('/api/wishlist/:destinationId', auth, async (req, res) => {
  const id = Number(req.params.destinationId);

  if (!db.destinations.some(destination => destination.id === id)) {
    return res.status(404).json({ error: 'Destination not found.' });
  }

  const [existingRows] = await mysqlPool.query('SELECT id FROM wishlists WHERE user_id = ? AND destination_id = ? AND directory_key IS NULL LIMIT 1', [req.user.id, id]);

  if (existingRows[0]) {
    await mysqlPool.query('DELETE FROM wishlists WHERE id = ?', [existingRows[0].id]);
  } else {
    await mysqlPool.query('INSERT INTO wishlists (id,user_id,destination_id) VALUES (?,?,?)', [crypto.randomUUID(), req.user.id, id]);
  }

  const [entries] = await mysqlPool.query('SELECT destination_id AS destinationId FROM wishlists WHERE user_id = ? AND destination_id IS NOT NULL', [req.user.id]);

  res.json({
    destinationIds: entries.map(item => item.destinationId)
  });
});

// Mark directory attraction visited
app.post('/api/visits/directory', auth, async (req, res) => {
  const key = String(req.body?.key || '').trim();
  const place = req.body?.place || {};

  if (!key || key.length > 600) {
    return res.status(400).json({ error: 'A valid directory place key is required.' });
  }

  const visitDate = String(req.body?.visitDate || new Date().toISOString().slice(0, 10));

  const [existingRows] = await mysqlPool.query('SELECT * FROM visits WHERE user_id = ? AND directory_key = ? AND visit_date = ? LIMIT 1', [req.user.id, key, visitDate]);
  let visit = existingRows[0];

  if (!visit) {
    const placeData = {
        key,
        name: String(place.name || '').slice(0, 180),
        state: String(place.state || '').slice(0, 100),
        district: String(place.district || '').slice(0, 120),
        category: String(place.category || '').slice(0, 80),
        image: String(place.image || '').slice(0, 2000),
        note: String(place.note || '').slice(0, 500),
        lat: Number.isFinite(Number(place.lat)) ? Number(place.lat) : null,
        lng: Number.isFinite(Number(place.lng)) ? Number(place.lng) : null
      };
    const id = crypto.randomUUID();
    await mysqlPool.query('INSERT INTO visits (id,user_id,directory_key,place,visit_date) VALUES (?,?,?,?,?)', [id, req.user.id, key, JSON.stringify(placeData), visitDate]);
    visit = { id, user_id: req.user.id, directory_key: key, place: placeData, visit_date: visitDate, memory_id: null };
    db.visits.push({ id, userId: req.user.id, directoryKey: key, place: placeData, visitDate, memoryId: null, createdAt: new Date().toISOString() });
  }

  res.json({ ok: true, visit });
});

// Mark catalogue destination visited
app.post('/api/visits/:destinationId', auth, async (req, res) => {
  const id = Number(req.params.destinationId);
  const destination = db.destinations.find(item => item.id === id);

  if (!destination) {
    return res.status(404).json({ error: 'Destination not found.' });
  }

  const visitDate = String(req.body?.visitDate || new Date().toISOString().slice(0, 10));

  const [existingRows] = await mysqlPool.query('SELECT * FROM visits WHERE user_id = ? AND destination_id = ? AND visit_date = ? AND directory_key IS NULL LIMIT 1', [req.user.id, id, visitDate]);
  let visit = existingRows[0];

  if (!visit) {
    const visitId = crypto.randomUUID();
    await mysqlPool.query('INSERT INTO visits (id,user_id,destination_id,visit_date) VALUES (?,?,?,?)', [visitId, req.user.id, id, visitDate]);
    visit = { id: visitId, user_id: req.user.id, destination_id: id, visit_date: visitDate, memory_id: null };
    db.visits.push({ id: visitId, userId: req.user.id, destinationId: id, visitDate, memoryId: null, createdAt: new Date().toISOString() });
  }

  res.json({ ok: true, visit });
});

// Get visit history
app.get('/api/visits', auth, async (req, res) => {
  const [rows] = await mysqlPool.query('SELECT * FROM visits WHERE user_id = ? ORDER BY visit_date DESC, created_at DESC', [req.user.id]);
  const visits = rows.map(visit => ({ ...visit, place: typeof visit.place === 'string' ? JSON.parse(visit.place) : visit.place, destinationId: visit.destination_id, directoryKey: visit.directory_key, visitDate: visit.visit_date, memoryId: visit.memory_id }));

  res.json({
    visits: visits.map(visit => ({
      ...visit,
      destination: visit.destinationId != null
        ? db.destinations.find(d => d.id === Number(visit.destinationId)) || null
        : null
    }))
  });
});

// Profile statistics and achievements
app.get('/api/passport', auth, (req, res) => {
  const visits = db.visits.filter(item => item.userId === req.user.id);
  const memories = db.memories.filter(item => item.userId === req.user.id);
  const saved = db.wishlists.filter(item => item.userId === req.user.id);

  const numericIds = [...new Set(
    visits.filter(visit => visit.destinationId != null).map(visit => Number(visit.destinationId))
  )];

  const visited = db.destinations.filter(destination => numericIds.includes(destination.id));

  const directoryPlaces = [
    ...new Map(
      visits.filter(visit => visit.directoryKey)
        .map(visit => [visit.directoryKey, visit.place])
        .filter(([, place]) => place)
    ).values()
  ];

  const states = [...new Set([
    ...visited.map(destination => destination.state),
    ...directoryPlaces.map(place => place.state)
  ].filter(Boolean))];

  const uniquePlaceCount = new Set([
    ...numericIds,
    ...visits.filter(visit => visit.directoryKey).map(visit => visit.directoryKey)
  ]).size;

  const achievements = [];

  if (uniquePlaceCount >= 1) {
    achievements.push({
      id: 'first-step',
      title: 'First Footprints',
      description: 'Record your first visit.'
    });
  }

  if (uniquePlaceCount >= 5) {
    achievements.push({
      id: 'five-places',
      title: 'Curious Wanderer',
      description: 'Record visits to five destinations.'
    });
  }

  if (states.length >= 3) {
    achievements.push({
      id: 'three-states',
      title: 'State Collector',
      description: 'Explore three states.'
    });
  }

  res.json({
    visited,
    visitedIds: numericIds,
    directoryPlaces,
    visitedDirectoryKeys: visits.filter(visit => visit.directoryKey).map(visit => visit.directoryKey),
    states,
    placesCount: uniquePlaceCount,
    memoriesCount: memories.length,
    wishlistCount: saved.length,
    stamps: visits,
    achievements
  });
});

// Dashboard statistics from actual user records
app.get('/api/dashboard', auth, async (req, res) => {
  const [visitRows] = await mysqlPool.query('SELECT * FROM visits WHERE user_id = ?', [req.user.id]);
  const visits = visitRows.map(visit => ({ ...visit, userId: visit.user_id, destinationId: visit.destination_id, directoryKey: visit.directory_key, visitDate: visit.visit_date, memoryId: visit.memory_id, place: typeof visit.place === 'string' ? JSON.parse(visit.place) : visit.place }));
  const [memoryRows] = await mysqlPool.query('SELECT * FROM memories WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const memories = memoryRows.map(memory => ({ ...memory, userId: memory.user_id, destinationId: memory.destination_id, directoryKey: memory.directory_key, visitDate: memory.visit_date, imageUrl: memory.image_url, images: typeof memory.images === 'string' ? JSON.parse(memory.images) : memory.images, imageCount: memory.image_count, tags: typeof memory.tags === 'string' ? JSON.parse(memory.tags) : memory.tags, destinationName: memory.destination_name, mediaType: memory.media_type, createdAt: memory.created_at }));
  const [wishlistRows] = await mysqlPool.query('SELECT destination_id AS destinationId, directory_key AS directoryKey, place FROM wishlists WHERE user_id = ?', [req.user.id]);
  const wishlist = wishlistRows.map(item => ({ ...item, place: typeof item.place === 'string' ? JSON.parse(item.place) : item.place }));

  const numericIds = [...new Set(
    visits.filter(visit => visit.destinationId != null).map(visit => Number(visit.destinationId))
  )];

  const visitedDestinations = db.destinations.filter(
    destination => numericIds.includes(destination.id)
  );

  const directoryVisits = visits.filter(visit => visit.directoryKey);

  const directoryPlaces = [
    ...new Map(
      directoryVisits.map(visit => [visit.directoryKey, visit.place]).filter(([, place]) => place)
    ).values()
  ];

  const stateNames = new Set([
    ...visitedDestinations.map(destination => destination.state),
    ...directoryPlaces.map(place => place.state)
  ].filter(Boolean));

  const placeKeys = new Set([
    ...numericIds.map(id => `destination:${id}`),
    ...directoryVisits.map(visit => `directory:${visit.directoryKey}`)
  ]);

  res.json({
    stats: {
      states: stateNames.size,
      places: placeKeys.size,
      memories: memories.length,
      wishlist: wishlist.length
    },
    recentMemories: memories.slice(0, 4),
    wishlistIds: wishlist.filter(item => item.destinationId != null).map(item => item.destinationId),
    wishlistDirectoryKeys: wishlist.filter(item => item.directoryKey).map(item => item.directoryKey),
    visitedIds: numericIds,
    visitedDirectoryKeys: [...new Set(directoryVisits.map(visit => visit.directoryKey))],
    visitedDirectoryPlaces: directoryPlaces
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  const isDatabaseError = typeof err.code === 'string' && err.code.startsWith('ER_');
  const status = err.status || (isDatabaseError ? 500 : 400);
  if (status >= 500) console.error('Request failed:', err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : (err.message || 'Request failed.') });
});

const port = Number(process.env.PORT || 4000);

initializeDatabase()
  .then(() => app.listen(port, () => {
    console.log(`Delusional Diary API running at http://localhost:${port}`);
  }))
  .catch(error => {
    console.error('Could not initialize MySQL:', error.message);
    process.exitCode = 1;
  });
