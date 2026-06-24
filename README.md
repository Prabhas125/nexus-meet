<div align="center">

<img src="https://img.shields.io/badge/NexusMeet-Video%20Conferencing-6366f1?style=for-the-badge&logo=webrtc&logoColor=white" alt="NexusMeet" />

# 📹 NexusMeet
### Real-Time Video Conferencing Web Application

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.6-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-Native-333333?style=flat-square&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**A production-ready, full-stack video conferencing platform with real-time collaboration tools — built as part of the CodeAlpha internship program.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Setup Guide](#-full-setup-guide) • [API Docs](#-api-reference) • [Screenshots](#-screenshots)

</div>

---

## ✨ Features

### 🎥 Video & Audio
- **Multi-user WebRTC video calling** — peer-to-peer mesh with adaptive grid layout (1→2→4→many)
- **Screen sharing** — live track replacement across all active peers
- **Camera & mic toggle** — real-time media state broadcast to all participants
- **Auto layout** — video grid adapts dynamically as participants join/leave

### 💬 Real-Time Communication
- **Live chat** — Socket.io-powered messaging, persisted in PostgreSQL
- **Collaborative whiteboard** — HTML5 Canvas with pen, eraser, shapes, and 8 colours, synced in real time
- **File sharing** — upload/download files inside the meeting room (up to 10 MB)
- **Participant panel** — live list of everyone in the room

### 🔐 Authentication & Security
- **JWT authentication** — secure Bearer token flow with 7-day expiry
- **bcrypt password hashing** — 12 salt rounds
- **Protected routes** — frontend and backend both guard resources
- **Input validation** — express-validator on every POST endpoint
- **Rate limiting** — 100 requests / 15 min per IP
- **Helmet.js** — sets secure HTTP headers out of the box

### 🏗️ Architecture
- **MVC layered backend** — controllers, services, middleware, routes
- **Prisma ORM** — type-safe PostgreSQL queries with auto-migrations
- **Nginx reverse proxy** — routes `/api`, `/socket.io`, `/uploads`, and `/` to the right service
- **Docker Compose** — one command spins up all four services with health checks

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Context API |
| **Real-time** | Socket.io 4.6 (client + server) |
| **Video/Audio** | WebRTC (native browser API, STUN) |
| **Whiteboard** | HTML5 Canvas |
| **Backend** | Node.js 20, Express 4 |
| **Database** | PostgreSQL 15 |
| **ORM** | Prisma 5 |
| **Authentication** | JWT + bcrypt |
| **File Upload** | Multer (disk storage, UUID filenames) |
| **Reverse Proxy** | Nginx (Alpine) |
| **DevOps** | Docker, Docker Compose |

---

## 📁 Project Structure

```
nexus-meet/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL schema
│   ├── src/
│   │   ├── config/database.js     # Prisma client singleton
│   │   ├── controllers/           # authController, meetingController, messageController, fileController
│   │   ├── middleware/            # JWT auth, input validation
│   │   ├── routes/                # auth, meeting, message, file routes
│   │   ├── services/
│   │   │   └── socketService.js   # ALL Socket.io + WebRTC signaling
│   │   ├── utils/helpers.js
│   │   ├── app.js                 # Express app + middleware stack
│   │   └── server.js              # Entry point
│   ├── uploads/                   # User-uploaded files
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/ChatPanel.js
│   │   │   ├── meeting/           # VideoTile, FilesPanel, ParticipantsPanel
│   │   │   └── whiteboard/Whiteboard.js
│   │   ├── contexts/              # AuthContext, SocketContext
│   │   ├── hooks/useWebRTC.js     # Peer connections, media, screen share
│   │   ├── pages/                 # Login, Register, Dashboard, Meeting
│   │   ├── services/api.js        # Axios API layer
│   │   ├── App.js
│   │   └── App.css                # Dark theme design system
│   ├── Dockerfile
│   └── package.json
│
├── nginx/nginx.conf               # Reverse proxy config
├── docker-compose.yml
└── README.md
```

---

## 🗄️ Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String                        // bcrypt hashed
  createdAt DateTime @default(now())
  hostedMeetings Meeting[]
  participations Participant[]
  messages  Message[]
  files     File[]
}

model Meeting {
  id           String    @id @default(uuid())
  roomCode     String    @unique          // e.g. "ABC-123-XYZ"
  title        String    @default("Untitled Meeting")
  hostId       String
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  participants Participant[]
  messages     Message[]
  files        File[]
}

model Participant {
  userId    String
  meetingId String
  joinedAt  DateTime  @default(now())
  leftAt    DateTime?
  @@unique([userId, meetingId])
}

model Message {
  id        String   @id @default(uuid())
  senderId  String
  meetingId String
  content   String
  type      String   @default("text")
  timestamp DateTime @default(now())
}

model File {
  id         String   @id @default(uuid())
  uploaderId String
  meetingId  String
  fileName   String
  fileUrl    String
  fileSize   Int
  mimeType   String
  uploadedAt DateTime @default(now())
}
```

---

## ⚡ Quick Start

### Option A — Docker (Recommended)

> Requires: [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
git clone https://github.com/Prabhas125/nexus-meet.git
cd nexus-meet
docker compose up --build
```

Open **http://localhost** in your browser. That's it! 🎉

---

### Option B — Local Development

**Prerequisites:** Node.js 18+, PostgreSQL 15

```bash
# 1. Clone the repo
git clone https://github.com/Prabhas125/nexus-meet.git
cd nexus-meet

# 2. Backend setup
cd backend
npm install
cp .env.example .env          # Edit DATABASE_URL with your postgres password
npm run prisma:migrate         # Creates all tables
npm run dev                    # Starts on http://localhost:5000

# 3. Frontend setup (new terminal)
cd ../frontend
npm install
npm start                      # Starts on http://localhost:3000
```

---

## 📖 Full Setup Guide

<details>
<summary><strong>A. Install PostgreSQL Locally</strong></summary>

**Windows:** Download from https://www.postgresql.org/download/windows/
- Run the installer, keep default port **5432**
- Set a password for the `postgres` user

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
```

Default credentials: host `localhost`, port `5432`, user `postgres`

</details>

<details>
<summary><strong>B. Create the Database</strong></summary>

```bash
# Connect to PostgreSQL
psql -U postgres

# In the psql shell:
CREATE DATABASE nexusmeet;
\q
```

</details>

<details>
<summary><strong>C. Backend .env Configuration</strong></summary>

```env
PORT=5000
NODE_ENV=development

# Replace 'yourpassword' with your PostgreSQL password
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/nexusmeet"

JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=7d

CLIENT_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
```

</details>

<details>
<summary><strong>D. Prisma Commands</strong></summary>

```bash
# Run migrations (creates all tables)
npm run prisma:migrate

# Open visual database browser
npm run prisma:studio          # http://localhost:5555

# Regenerate Prisma client after schema changes
npm run prisma:generate
```

</details>

<details>
<summary><strong>E. Docker Commands</strong></summary>

```bash
docker compose up --build      # Build and start all services
docker compose up -d           # Start in background
docker compose logs -f         # Stream all logs
docker compose logs -f backend # Logs for one service
docker compose down            # Stop all services
docker compose down -v         # Stop + delete all data
docker compose ps              # Check running containers
```

PostgreSQL port inside Docker is mapped to **5433** to avoid conflicts with a local install.

</details>

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Body | Auth |
|--------|----------|------|------|
| POST | `/api/auth/register` | `{ name, email, password }` | — |
| POST | `/api/auth/login` | `{ email, password }` | — |
| GET | `/api/auth/me` | — | Bearer |

### Meetings
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/meetings` | List user's meetings | Bearer |
| POST | `/api/meetings` | Create meeting | Bearer |
| GET | `/api/meetings/:roomCode` | Get meeting details | Bearer |
| POST | `/api/meetings/:roomCode/join` | Join a meeting | Bearer |
| POST | `/api/meetings/:roomCode/leave` | Leave a meeting | Bearer |

### Messages & Files
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/messages/:meetingId` | Fetch chat history | Bearer |
| POST | `/api/files/upload/:meetingId` | Upload a file | Bearer |
| GET | `/api/files/:meetingId` | List meeting files | Bearer |
| GET | `/api/health` | Health check | — |

---

## 📡 Socket.io Event Reference

### Client → Server
```javascript
socket.emit('join-room',            { roomCode })
socket.emit('leave-room',           { roomCode })
socket.emit('webrtc-offer',         { targetSocketId, offer, roomCode })
socket.emit('webrtc-answer',        { targetSocketId, answer })
socket.emit('ice-candidate',        { targetSocketId, candidate })
socket.emit('media-state',          { roomCode, videoEnabled, audioEnabled })
socket.emit('screen-share-started', { roomCode })
socket.emit('screen-share-stopped', { roomCode })
socket.emit('chat-message',         { roomCode, meetingId, content })
socket.emit('whiteboard-draw',      { roomCode, drawData })
socket.emit('whiteboard-clear',     { roomCode })
socket.emit('file-shared',          { roomCode, file })
```

### Server → Client
```javascript
socket.on('room-participants',         ({ participants }))
socket.on('user-joined',               ({ socketId, user }))
socket.on('user-left',                 ({ socketId, user }))
socket.on('webrtc-offer',              ({ fromSocketId, fromUser, offer }))
socket.on('webrtc-answer',             ({ fromSocketId, answer }))
socket.on('ice-candidate',             ({ fromSocketId, candidate }))
socket.on('peer-media-state',          ({ socketId, videoEnabled, audioEnabled }))
socket.on('peer-screen-share-started', ({ socketId, user }))
socket.on('chat-message',              ({ id, sender, content, timestamp }))
socket.on('whiteboard-draw',           ({ drawData, user }))
socket.on('whiteboard-clear',          ())
socket.on('file-shared',               ({ file, sharedBy }))
```

---

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT tokens with configurable expiry
- [x] All API routes protected with auth middleware
- [x] WebSocket connections authenticated on handshake
- [x] Input validation with express-validator
- [x] Rate limiting (100 req / 15 min per IP)
- [x] Helmet.js HTTP security headers
- [x] CORS restricted to whitelisted origin
- [x] File uploads: MIME type + 10 MB size limits
- [x] UUID-based filenames prevent path traversal
- [x] Non-root Docker user in production image

---

## 🛠 Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on backend start | PostgreSQL isn't running yet — it retries automatically |
| Camera/mic not working | Click "Allow" in the browser permission prompt |
| Videos not showing between users | Both must be on the same network; TURN servers needed for cross-network |
| Port 5432 conflict (Docker) | Docker maps to port **5433** externally |
| `No configuration file provided` | `cd` into the `nexus-meet` folder where `docker-compose.yml` lives |
| Prisma `Environment variable not found` | Make sure `backend/.env` exists and `DATABASE_URL` is set |

---

## 🌐 Production Notes

- Add HTTPS (WebRTC requires it outside localhost) via Let's Encrypt + Certbot
- Configure a TURN server (Coturn / Twilio) for users behind strict NATs
- Rotate `JWT_SECRET` and database password before deploying
- Set `NODE_ENV=production` to disable verbose Prisma query logging

---

## 📄 License

MIT © 2024 — Built during the [CodeAlpha](https://www.codealpha.tech/) Internship Program

---

<div align="center">

Made with ❤️ using React · Node.js · WebRTC · Socket.io · PostgreSQL · Docker

⭐ Star this repo if you found it useful!

</div>
