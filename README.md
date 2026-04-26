# 💬 Chatterbox

A **production-grade, real-time chat application** built with a modern full-stack architecture. Chatterbox supports public rooms, private invite-only rooms, direct messaging, a full friend system, file sharing, and scalable presence tracking — all backed by a hardened security layer.

> **Live Demo:** [chatterbox.netlify.app](https://chatterbox.netlify.app) &nbsp;|&nbsp; **API:** Deployed on [Render](https://render.com)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Socket Events](#-socket-events)
- [Security](#-security)
- [Deployment](#-deployment)
- [Roadmap](#-roadmap)

---

## ✨ Features

### 💬 Messaging
- **Real-time messaging** via WebSockets (Socket.io) with optimistic UI updates
- **Optimistic UI** — messages appear instantly with a pending state, confirmed after DB save
- **Edit & Delete** messages (author-only; room creators can delete any message)
- **Unsend all** — bulk-delete your own messages in a room or DM conversation
- **File & media sharing** — upload images, videos, and files via Cloudinary (drag-and-drop supported)
- **Typing indicators** — live "User is typing…" display in rooms and DMs

### 🏠 Rooms
- **Public rooms** — visible in the lobby; anyone can join
- **Private rooms** — invite-only with a unique invite code; auto-expire after **24 hours** (MongoDB TTL index)
- **Room creator controls** — clear chat history, delete room, manage members
- **Live user list** — see who is currently in a room, updated in real time on join/leave

### 👥 Friends & Direct Messages
- **Friend system** — send, accept, and decline friend requests
- **Direct Messages (DMs)** — private 1-on-1 conversations with friends
- **Online presence** — see who's online in real time; status synced via Redis (accurate across multiple server instances)
- **DM typing indicators** — per-conversation typing notifications

### 👤 User Profiles
- **Avatar upload** via Cloudinary with live preview
- **Display name** — set a friendly name separate from your username
- **Password change** with old-password verification and strength enforcement
- **Profile page** with settings for account details and security

### 🔒 Security
- **JWT authentication** on both REST API and WebSocket connections
- **Password hashing** with bcrypt (10 rounds)
- **Strong password enforcement** — min 8 chars, uppercase, lowercase, number, and symbol required
- **Input validation** on all REST endpoints via `express-validator`
- **XSS sanitization** — all message content sanitized with the `xss` library before storage
- **Rate limiting** — 100 req/15 min on all API routes; per-user socket event throttling
- **Security headers** via Helmet.js with a strict Content Security Policy (CSP)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────┐
│                   CLIENT                    │
│  React + TypeScript + Vite (Netlify CDN)    │
│  Pages: Lobby, ChatRoom, DM, Friends,       │
│         Profile, Login, Register            │
└──────────────────┬──────────────────────────┘
                   │  HTTPS / WSS
┌──────────────────▼──────────────────────────┐
│                   SERVER                    │
│  Express.js (Node.js / Render)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ REST API │  │Socket.io │  │  Helmet / │ │
│  │ Routes   │  │ Handlers │  │  CORS     │ │
│  └────┬─────┘  └────┬─────┘  └───────────┘ │
│       │              │                       │
│  ┌────▼──────────────▼──────┐               │
│  │     Redis (ioredis)      │               │
│  │  • Socket.io pub/sub     │               │
│  │  • Online presence store │               │
│  └──────────────────────────┘               │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│               MONGODB ATLAS                 │
│  Collections: users, rooms, messages        │
└─────────────────────────────────────────────┘
                   +
┌─────────────────────────────────────────────┐
│              CLOUDINARY CDN                 │
│  Avatar images, file attachments            │
└─────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend (`/client`)
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| React Router v6 | Client-side routing |
| Socket.io Client | Real-time WebSocket connection |
| Axios | HTTP requests |
| react-hot-toast | Toast notifications |
| Lucide React | Icon library |
| Headless UI | Accessible UI primitives (dropdowns, transitions) |

### Backend (`/server`)
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | HTTP server & REST API |
| Socket.io | WebSocket server |
| MongoDB + Mongoose | Primary database & ODM |
| Redis (ioredis) | Presence tracking & Socket.io pub/sub adapter |
| `@socket.io/redis-adapter` | Horizontal scaling for Socket.io |
| JSON Web Tokens | Stateless authentication |
| bcryptjs | Password hashing |
| Cloudinary | Cloud media storage |
| Multer | Multipart file upload handling |
| Helmet.js | Security headers & CSP |
| express-rate-limit | API rate limiting |
| express-validator | Request input validation |
| xss | Message content sanitization |
| nanoid | Unique invite code generation |

### Infrastructure
| Service | Purpose |
|---|---|
| MongoDB Atlas | Managed database |
| Cloudinary | Media CDN |
| Docker / Docker Compose | Local Redis container |
| Render | Server hosting |
| Netlify | Client hosting + CDN |

---

## 📁 Project Structure

```
Chatterbox/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── HomePage.tsx        # Landing page
│       │   ├── LoginPage.tsx       # Login form
│       │   ├── RegisterPage.tsx    # Registration form
│       │   ├── LobbyPage.tsx       # Room browser & creation
│       │   ├── ChatRoomPage.tsx    # Public/private room chat
│       │   ├── DirectMessagePage.tsx # 1-on-1 DM chat
│       │   ├── FriendsPage.tsx     # Friend management
│       │   ├── ConversationsPage.tsx # DM conversation list
│       │   └── ProfilePage.tsx     # User settings & profile
│       ├── components/             # Shared UI components
│       ├── utils/
│       │   └── errorUtils.ts       # API error parsing helper
│       └── App.tsx                 # Router & route guards
│
├── server/                        # Express backend
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/               # Route handler logic
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT verification for REST
│   │   ├── validationMiddleware.js # express-validator chains
│   │   ├── rateLimitMiddleware.js  # Rate limiter config
│   │   └── errorMiddleware.js      # Global error handler
│   ├── models/
│   │   ├── User.js                 # User schema (with friends)
│   │   ├── Room.js                 # Room schema (with TTL)
│   │   └── Message.js              # Message schema (DM + room)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── userRoutes.js
│   │   ├── friendRoutes.js
│   │   └── messageRoutes.js
│   ├── socket/                    # Modular Socket.io layer
│   │   ├── index.js               # Socket server init & Redis adapter
│   │   ├── state.js               # Shared in-memory state (roomUsers)
│   │   ├── middleware/
│   │   │   └── auth.js            # Socket JWT authentication
│   │   └── handlers/
│   │       ├── roomHandler.js     # joinRoom, joinDM
│   │       ├── messageHandler.js  # send, edit, delete, unsend
│   │       └── presenceHandler.js # typing, disconnect, online status
│   └── server.js                  # App entry point
│
├── docker-compose.yml             # Redis local development
├── docs/
│   └── task.md                    # Development roadmap
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **Docker Desktop** (for local Redis) or a Redis Cloud instance
- A **MongoDB Atlas** cluster
- A **Cloudinary** account (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chatterbox.git
cd chatterbox
```

### 2. Start Redis (Docker)

```bash
docker-compose up -d
```

This starts a Redis container on `localhost:6379` with a persistent volume.

### 3. Set Up the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory (see [Environment Variables](#-environment-variables) below), then start the dev server:

```bash
npm run dev
```

The server starts on **http://localhost:5000**.

### 4. Set Up the Client

```bash
cd ../client
npm install
```

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:5000
```

Then start the dev server:

```bash
npm run dev
```

The client starts on **http://localhost:5173**.

---

## 🔐 Environment Variables

### Server (`server/.env`)

```env
# ── Database ──────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/chatterbox

# ── Authentication ────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_change_this

# ── Redis ─────────────────────────────────────────────
REDIS_URL=redis://localhost:6379
# Production example: redis://red-xxxxxxxxx.render.com:6379

# ── CORS (allowed origins) ────────────────────────────
CLIENT_URL=https://your-app.netlify.app
CLIENT_URL_LOCAL=http://localhost:5173

# ── Cloudinary ────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Server ────────────────────────────────────────────
PORT=5000
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
```

---

## 📡 API Reference

All endpoints are prefixed with `/api` and rate-limited to **100 requests per 15 minutes**.

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | ❌ | Register a new user |
| `POST` | `/login` | ❌ | Login and receive JWT |
| `PUT` | `/update-profile` | ✅ | Update display name / avatar |
| `PUT` | `/update-password` | ✅ | Change password |

### Rooms — `/api/rooms`
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | List all public rooms |
| `GET` | `/my-rooms` | ✅ | List rooms created by you |
| `POST` | `/create` | ✅ | Create a public room |
| `POST` | `/create-private` | ✅ | Create a private room with invite code |
| `POST` | `/join-private` | ✅ | Join a private room via invite code |
| `DELETE` | `/:roomId` | ✅ | Delete a room (creator only) |

### Users — `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/search` | ✅ | Search users by username |
| `GET` | `/:id` | ✅ | Get a user's public profile |

### Friends — `/api/friends`
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | ✅ | Get friends list |
| `GET` | `/requests` | ✅ | Get pending friend requests |
| `POST` | `/request/:userId` | ✅ | Send a friend request |
| `PUT` | `/accept/:userId` | ✅ | Accept a friend request |
| `PUT` | `/decline/:userId` | ✅ | Decline a friend request |
| `DELETE` | `/:userId` | ✅ | Remove a friend |

### Messages — `/api/messages`
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/upload` | ✅ | Upload a file attachment (Cloudinary) |

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Server health check (uptime, timestamp) |

---

## ⚡ Socket Events

The WebSocket server requires a valid JWT passed in `socket.handshake.auth.token`.

### Client → Server (Emit)
| Event | Payload | Description |
|---|---|---|
| `joinRoom` | `{ roomId }` | Join a public/private chat room |
| `joinDM` | `{ friendId }` | Open a DM conversation with a friend |
| `sendMessage` | `{ text, fileUrl, fileType, roomId?, friendId? }` | Send a message |
| `editMessage` | `{ messageId, newText }` | Edit your own message |
| `deleteMessage` | `{ messageId }` | Delete a message |
| `clearRoomChat` | `{ roomId }` | Clear all room messages (creator only) |
| `unsendAllMyRoomMessages` | `{ roomId }` | Bulk-delete your messages in a room |
| `unsendAllMyDMs` | `{ friendId }` | Bulk-delete your DMs with a friend |
| `typing` | `{ roomId, user }` | Broadcast typing indicator to room |
| `dmTyping` | `{ friendId }` | Broadcast typing indicator to friend |
| `stopDmTyping` | `{ friendId }` | Stop broadcasting typing to friend |

### Server → Client (Listen)
| Event | Payload | Description |
|---|---|---|
| `loadHistory` | `Message[]` | Initial chat history on room/DM join |
| `receiveMessage` | `Message` | Optimistic (pending) message broadcast |
| `messageConfirmed` | `{ tempId, savedMessage }` | Confirmation after DB save |
| `messageEdited` | `Message` | Updated message after edit |
| `messageDeleted` | `{ messageId }` | ID of deleted message |
| `messagesUnsent` | `{ userId }` | Bulk-unsend notification |
| `chatCleared` | — | All messages cleared from room |
| `updateUserList` | `User[]` | Current list of users in room |
| `systemMessage` | `string` | Join/leave announcements |
| `roomDetails` | `{ inviteCode }` | Invite code (sent to creator only) |
| `friendStatus` | `{ isOnline: boolean }` | Friend's online status on DM open |
| `userStatusUpdate` | `{ userId, isOnline }` | Global online/offline status change |
| `userTyping` | `User` | Someone typing in a room |
| `friendTyping` | — | Friend is typing in DM |
| `friendStoppedTyping` | — | Friend stopped typing in DM |
| `error` | `string` | Error message |

---

## 🔒 Security

### Authentication
- **REST API:** `Authorization: Bearer <token>` header verified by `authMiddleware.js`
- **WebSocket:** Token extracted from `socket.handshake.auth.token` and verified in `socket/middleware/auth.js`
- JWTs expire and must be refreshed via re-login

### Password Policy
Enforced server-side via `express-validator` (custom validator in `validationMiddleware.js`):
- Minimum **8 characters**
- At least **1 uppercase** letter
- At least **1 lowercase** letter
- At least **1 number**
- At least **1 symbol** (`!@#$...`)

### Input Validation
All REST endpoints validate inputs with `express-validator`. Validation errors return a structured `400` response with per-field error details.

### XSS Prevention
All message text is run through the `xss` library before being saved to MongoDB or broadcast over sockets. This strips or escapes any malicious HTML/script injection.

### Rate Limiting
- **REST API:** 100 requests per 15-minute window per IP (`express-rate-limit`)
- **Socket events:** Per-user throttling on high-frequency events

### HTTP Security Headers (Helmet.js)
A strict **Content Security Policy** is applied:
- `script-src: 'self'` — no inline scripts or external script sources
- `connect-src` — only allows connections to the configured API origin
- `img-src` / `media-src` — allows HTTPS and `blob:` URLs for Cloudinary assets

---

## 🚢 Deployment

### Client → Netlify

1. Push the `client/` directory (or root) to GitHub.
2. Connect the repo to Netlify.
3. Set **Build command:** `npm run build`, **Publish directory:** `dist`.
4. Add environment variable: `VITE_API_URL=https://your-server.onrender.com`
5. Add a `netlify.toml` redirect for SPA routing:
   ```toml
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

### Server → Render

1. Create a **Web Service** pointing to the `server/` directory.
2. Set **Build command:** `npm install`, **Start command:** `npm start`.
3. Add all environment variables from `server/.env` in the Render dashboard.
4. **Create a Redis instance** (Render Redis or [Upstash](https://upstash.com)) and set `REDIS_URL` to the connection string.

> ⚠️ **Important:** Without a valid `REDIS_URL` pointing to a live Redis instance, the server will fail to maintain presence across restarts and the Socket.io adapter won't initialize correctly.

### Database → MongoDB Atlas

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Whitelist `0.0.0.0/0` (or Render's IP range) in Network Access.
3. Copy the connection string into `MONGO_URI`.

---

## 🗺 Roadmap

### ✅ Completed
- [x] JWT authentication (register / login)
- [x] Public & private rooms with invite codes
- [x] Real-time messaging with Socket.io
- [x] File / media uploads via Cloudinary
- [x] Friend system & direct messaging
- [x] Online presence (Redis-backed, multi-instance safe)
- [x] Typing indicators (rooms & DMs)
- [x] Message edit, delete, unsend
- [x] Rate limiting (REST + sockets)
- [x] Input validation (`express-validator`)
- [x] XSS sanitization (`xss`)
- [x] Security headers (Helmet.js + CSP)
- [x] Password strength enforcement
- [x] Redis adapter (Socket.io horizontal scaling)
- [x] Modular server architecture (`socket/` handlers)
- [x] Health check endpoint

### 🔜 In Progress / Planned
- [ ] Message pagination (infinite scroll)
- [ ] Redis caching for user profiles and room metadata
- [ ] Refresh token rotation
- [ ] Jest unit & integration tests
- [ ] TypeScript migration (server)
- [ ] Read receipts & message reactions
- [ ] Push notifications (Web Push API)
- [ ] API documentation (Swagger / Postman collection)

---

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m 'feat: add your feature'`.
4. Push the branch: `git push origin feature/your-feature`.
5. Open a Pull Request.

---

## 📄 License

MIT © Chatterbox Contributors
