/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           NEXUS CHAT v3.0 — server.js               ║
 * ║           by Prince Kumar Yadav                      ║
 * ╠══════════════════════════════════════════════════════╣
 * ║  Auth: username + password (SHA-256) · unique user   ║
 * ║  Chat: group · edit · delete · reply · history       ║
 * ║  Media: image · video · audio · voice PTT            ║
 * ╚══════════════════════════════════════════════════════╝
 */

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const multer     = require('multer');
const path       = require('path');
const crypto     = require('crypto');
const fs         = require('fs');

const User    = require('./models/User');
const Message = require('./models/Message');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors:              { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 50e6,
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(express.json({ limit: '50mb' }));

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.static(path.join(__dirname, 'public')));

// ── MongoDB ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-chat-v3';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅  MongoDB connected'))
  .catch(e  => console.error('❌  MongoDB:', e.message));

// ── Multer ───────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const ALLOWED_MIMES = new Set([
  'image/jpeg','image/png','image/gif','image/webp',
  'video/mp4','video/webm','video/ogg','video/quicktime',
  'audio/mpeg','audio/wav','audio/webm','audio/ogg','audio/mp4',
]);

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIMES.has(file.mimetype)),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video
});

// ── Helpers ──────────────────────────────────────────────────────────────────
const sanitize = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').trim();
const genSid   = ()  => crypto.randomBytes(24).toString('hex');

// ════════════════════════════════════════════════════════════════════════════
//  REST API
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/auth/register ──────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const username = sanitize(req.body.username).slice(0, 24);
    const password = String(req.body.password || '').trim();

    if (username.length < 2) return res.status(400).json({ error: 'Username must be at least 2 characters.' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters.' });

    // Check if username already taken
    const exists = await User.findOne({ username });
    if (exists) return res.status(409).json({ error: 'Username already taken. Choose a different one.' });

    const passwordHash = User.hashPassword(password);
    const sessionId    = genSid();

    const user = await User.create({ username, passwordHash, sessionId, lastSeen: new Date() });

    res.json({
      success: true,
      user: {
        username:  user.username,
        avatar:    user.customAvatar || user.avatar,
        sessionId: user.sessionId,
      },
      messages: [], // new user → empty history
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Username already taken.' });
    console.error('/register:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const username = sanitize(req.body.username).slice(0, 24);
    const password = String(req.body.password || '').trim();

    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const user = await User.findOne({ username });
    if (!user)                    return res.status(401).json({ error: 'Username not found.' });
    if (!user.checkPassword(password)) return res.status(401).json({ error: 'Incorrect password.' });

    const sessionId = genSid();
    user.sessionId  = sessionId;
    user.lastSeen   = new Date();
    await user.save();

    // Fetch only THIS user's message history
    const messages = await Message.find({ room: 'general', deleted: false })
      .sort({ timestamp: -1 }).limit(60).lean();

    res.json({
      success: true,
      user: {
        username:  user.username,
        avatar:    user.customAvatar || user.avatar,
        sessionId,
      },
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error('/login:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/upload ─────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file or unsupported format.' });
  const mime = req.file.mimetype;
  let type = 'audio';
  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('video/')) type = 'video';
  res.json({ url: `/uploads/${req.file.filename}`, type });
});

// ── POST /api/upload/avatar ───────────────────────────────────────────────────
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file.' });
  const url = `/uploads/${req.file.filename}`;
  if (req.body.username) {
    await User.findOneAndUpdate({ username: req.body.username }, { customAvatar: url });
  }
  res.json({ url });
});

// ── GET /api/messages ─────────────────────────────────────────────────────────
app.get('/api/messages', async (req, res) => {
  const { room = 'general', page = 1, limit = 30 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [messages, total] = await Promise.all([
    Message.find({ room, deleted: false }).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Message.countDocuments({ room, deleted: false }),
  ]);
  res.json({ messages: messages.reverse(), total, page: parseInt(page), hasMore: total > skip + parseInt(limit) });
});

// ── GET /api/users/online ─────────────────────────────────────────────────────
app.get('/api/users/online', async (req, res) => {
  const users = await User.find({ isOnline: true }).select('username avatar customAvatar').lean();
  res.json(users);
});

// ── DELETE /api/messages/:id ──────────────────────────────────────────────────
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { username } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg)              return res.status(404).json({ error: 'Not found.' });
    if (msg.sender !== username) return res.status(403).json({ error: 'Forbidden.' });
    msg.deleted = true;
    await msg.save();
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Server error.' }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  Socket.io
// ════════════════════════════════════════════════════════════════════════════
const onlineUsers = new Map(); // socketId → { username, avatar, socketId }

io.on('connection', (socket) => {
  console.log(`⚡ [CONNECT] ${socket.id}`);

  // ── JOIN ──────────────────────────────────────────────────────────────────
  socket.on('join', async ({ username, avatar, sessionId }) => {
    try {
      // Verify session
      const user = await User.findOne({ username, sessionId });
      if (!user) { socket.emit('auth-error', { message: 'Invalid session. Please login again.' }); return; }

      socket.username = user.username;
      socket.avatar   = user.customAvatar || user.avatar || avatar;
      socket.room     = 'general';
      socket.join('general');

      onlineUsers.set(socket.id, { username: socket.username, avatar: socket.avatar, socketId: socket.id });

      await User.findByIdAndUpdate(user._id, { isOnline: true, lastSeen: new Date() });

      // Send full online list to joiner
      socket.emit('online-users', Array.from(onlineUsers.values()));
      socket.emit('join-confirmed', { username: socket.username, avatar: socket.avatar });

      // Notify others
      socket.to('general').emit('user-joined', {
        username:    socket.username,
        avatar:      socket.avatar,
        socketId:    socket.id,
        onlineUsers: Array.from(onlineUsers.values()),
      });

      console.log(`   👤 "${socket.username}" joined | Total: ${onlineUsers.size}`);
    } catch (e) { console.error('join:', e); }
  });

  // ── SEND MESSAGE ──────────────────────────────────────────────────────────
  socket.on('chat-message', async (data) => {
    try {
      if (!socket.username) return;
      const type    = ['text','image','video','audio','voice-ptt'].includes(data.type) ? data.type : 'text';
      const content = type === 'text' ? sanitize(data.content) : String(data.content || '');
      if (type === 'text' && !content) return;

      const replyTo = data.replyTo ? {
        messageId: data.replyTo.messageId || null,
        sender:    sanitize(data.replyTo.sender || ''),
        content:   sanitize(data.replyTo.content || '').slice(0, 120),
        type:      data.replyTo.type || 'text',
      } : {};

      const msg = await Message.create({
        room:          socket.room || 'general',
        sender:        socket.username,
        senderAvatar:  socket.avatar,
        content,
        type,
        audioDuration: data.audioDuration || 0,
        replyTo,
        readBy:        [socket.username],
        timestamp:     new Date(),
      });

      io.to(socket.room || 'general').emit('chat-message', msg.toObject());
    } catch (e) { console.error('chat-message:', e); }
  });

  // ── EDIT MESSAGE ──────────────────────────────────────────────────────────
  socket.on('edit-message', async ({ messageId, newContent }) => {
    try {
      if (!socket.username) return;
      const text = sanitize(newContent);
      if (!text) return;

      const msg = await Message.findOneAndUpdate(
        { _id: messageId, sender: socket.username, type: 'text' },
        { content: text, edited: true, editedAt: new Date() },
        { new: true }
      );
      if (!msg) return;

      io.to(socket.room || 'general').emit('message-edited', {
        messageId: msg._id,
        newContent: msg.content,
        editedAt:   msg.editedAt,
      });
    } catch (e) { console.error('edit-message:', e); }
  });

  // ── DELETE MESSAGE ────────────────────────────────────────────────────────
  socket.on('delete-message', async ({ messageId }) => {
    try {
      if (!socket.username) return;
      const msg = await Message.findOneAndUpdate(
        { _id: messageId, sender: socket.username },
        { deleted: true },
        { new: true }
      );
      if (!msg) return;
      io.to(socket.room || 'general').emit('message-deleted', { messageId: msg._id });
    } catch (e) { console.error('delete-message:', e); }
  });

  // ── TYPING ────────────────────────────────────────────────────────────────
  socket.on('typing', (isTyping) => {
    socket.to(socket.room || 'general').emit('user-typing', {
      username: socket.username,
      avatar:   socket.avatar,
      isTyping: Boolean(isTyping),
    });
  });

  // ── MESSAGE SEEN ──────────────────────────────────────────────────────────
  socket.on('message-seen', async ({ messageId }) => {
    try {
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: socket.username } },
        { new: true }
      );
      if (updated) {
        io.to(socket.room || 'general').emit('message-seen', {
          messageId,
          readBy: updated.readBy,
        });
      }
    } catch (_) {}
  });

  // ── VOICE PTT ─────────────────────────────────────────────────────────────
  socket.on('voice-ptt', ({ audioData, mimeType, duration }) => {
    socket.to(socket.room || 'general').emit('voice-ptt', {
      username:     socket.username,
      avatar:       socket.avatar,
      audioData,
      mimeType,
      duration:     duration || 0,
      timestamp:    new Date(),
    });
  });

  // ── WebRTC ────────────────────────────────────────────────────────────────
  socket.on('webrtc-offer',  ({ offer, targetSocketId })     => io.to(targetSocketId).emit('webrtc-offer',  { offer, fromSocketId: socket.id, fromUsername: socket.username }));
  socket.on('webrtc-answer', ({ answer, targetSocketId })    => io.to(targetSocketId).emit('webrtc-answer', { answer, fromSocketId: socket.id }));
  socket.on('webrtc-ice',    ({ candidate, targetSocketId }) => io.to(targetSocketId).emit('webrtc-ice',    { candidate, fromSocketId: socket.id }));

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on('disconnect', async (reason) => {
    const username = socket.username;
    onlineUsers.delete(socket.id);
    if (username) {
      await User.findOneAndUpdate({ username }, { isOnline: false, lastSeen: new Date() });
      socket.to(socket.room || 'general').emit('user-left', {
        username,
        socketId:    socket.id,
        onlineUsers: Array.from(onlineUsers.values()),
      });
      console.log(`🔌 [DISCONNECT] "${username}" | Reason: ${reason}`);
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          NEXUS CHAT v3.0 — ONLINE                   ║');
  console.log(`║  http://localhost:${PORT}                               ║`);
  console.log('║  Auth: username + password  ·  MongoDB persistence   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
});
