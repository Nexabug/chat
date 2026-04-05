# ⚡ Nexus Chat v2.0
**by Prince Kumar Yadav**

> Production-level real-time group chat with voice PTT, media sharing, persistent history, and MongoDB.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup MongoDB
**Option A — Local (free):**
- Install MongoDB Community: https://www.mongodb.com/try/download/community
- It auto-starts on `mongodb://localhost:27017`

**Option B — MongoDB Atlas (cloud, free tier):**
- Go to https://cloud.mongodb.com
- Create free cluster → Get connection string
- Paste in `.env` as `MONGODB_URI`

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI
```

### 4. Run Server
```bash
npm run dev     # development (nodemon auto-restart)
npm start       # production
```

### 5. Open
- `http://localhost:3000` → Login page
- Enter username → click ENTER NEXUS → Chat!

---

## ✨ Features

### 🔐 Authentication
| Feature | Status |
|---|---|
| Username-based login | ✅ |
| Session restore on rejoin | ✅ |
| Auto-generate avatar (DiceBear initials) | ✅ |
| Custom avatar upload | ✅ |

### 💬 Chat
| Feature | Status |
|---|---|
| Real-time group messaging | ✅ |
| Reply to specific message | ✅ |
| @mention highlighting | ✅ |
| Message timestamps | ✅ |
| Sent / Seen status (👁) | ✅ |
| Date separators | ✅ |
| Emoji support | ✅ |

### 🎙 Voice
| Feature | Status |
|---|---|
| Push-to-talk (hold mic button) | ✅ |
| Voice message audio player | ✅ |
| WebRTC signaling (offer/answer/ICE) | ✅ |

### 📁 Media
| Feature | Status |
|---|---|
| Image upload (jpg, png, gif, webp) | ✅ |
| Audio upload (mp3, wav, webm) | ✅ |
| Image lightbox (click to expand) | ✅ |
| Upload progress bar | ✅ |
| Max file size: 15MB | ✅ |

### 💾 Persistence
| Feature | Status |
|---|---|
| MongoDB chat history | ✅ |
| History restore on rejoin | ✅ |
| Lazy loading (scroll up for older) | ✅ |
| Paginated API | ✅ |

### 🔔 Extra
| Feature | Status |
|---|---|
| Typing indicator | ✅ |
| Online/offline status | ✅ |
| Browser notifications | ✅ |
| CORS for external access | ✅ |
| Input sanitization (XSS safe) | ✅ |

---

## 📁 Project Structure

```
nexus-chat-v2/
├── server.js              ← Express + Socket.io + MongoDB backend
├── package.json
├── .env.example
├── models/
│   ├── User.js            ← Mongoose user schema
│   └── Message.js         ← Mongoose message schema
└── public/
    ├── index.html         ← Login page (glassmorphism)
    ├── chat.html          ← Full React + Tailwind chat app
    └── uploads/           ← Local media storage (auto-created)
```

---

## 🌐 Networking

### Ngrok (Instant)
```bash
ngrok http 3000
# Share the https://xxxx.ngrok-free.app link
```

### Port Forwarding
1. Find local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Router → Port Forwarding → Port 3000 → Your local IP
3. Windows Firewall → Inbound Rule → Port 3000 → Allow
4. Share your public IP: http://whatismyip.com

---

## 🔄 Switch to Cloud Storage (Optional)

### Firebase Storage
1. Create project at https://console.firebase.google.com
2. Enable Storage
3. Replace `POST /api/upload` in `server.js` with Firebase Admin SDK upload
4. Fill Firebase vars in `.env`

### AWS S3
1. Create S3 bucket in AWS Console
2. Install: `npm install @aws-sdk/client-s3`
3. Replace disk storage with S3 upload in multer callback
4. Fill AWS vars in `.env`

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Real-time | Socket.io v4 |
| Voice Signaling | WebRTC (via Socket.io) |
| Database | MongoDB + Mongoose |
| Frontend | React 18 (CDN) + Tailwind CSS (CDN) |
| Fonts | Orbitron + DM Sans |
| Avatars | DiceBear API |
| Media | Multer (local disk) |
| Tunneling | Ngrok |

---

## 📡 API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login/register user, get session + history |
| `POST` | `/api/upload` | Upload image or audio file |
| `POST` | `/api/upload/avatar` | Upload profile picture |
| `GET`  | `/api/messages` | Paginated chat history |
| `GET`  | `/api/users/online` | Currently online users |

## 🔌 Socket Events

| Event | Direction | Payload |
|---|---|---|
| `join` | Client→Server | `{ username, avatar, sessionId }` |
| `chat-message` | Both | `{ content, type, replyTo }` |
| `typing` | Client→Server | `boolean` |
| `message-seen` | Client→Server | `{ messageId }` |
| `voice-ptt` | Both | `{ audioData (base64), mimeType, duration }` |
| `webrtc-offer` | Client→Server | `{ offer, targetSocketId }` |
| `webrtc-answer` | Client→Server | `{ answer, targetSocketId }` |
| `webrtc-ice` | Client→Server | `{ candidate, targetSocketId }` |
| `online-users` | Server→Client | `[{ username, avatar, socketId }]` |
| `user-joined` | Server→Client | `{ username, onlineUsers }` |
| `user-left` | Server→Client | `{ username, onlineUsers }` |
| `user-typing` | Server→Client | `{ username, isTyping }` |
| `partner-typing` | Server→Client | Alias for user-typing |

---

*Nexus Chat v2.0 — Built by Prince Kumar Yadav*
