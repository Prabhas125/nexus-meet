/**
 * Socket.io Service
 * Handles all real-time events:
 * - WebRTC signaling (offer/answer/ICE candidates)
 * - Chat messages
 * - Whiteboard events
 * - Participant join/leave
 * - Screen sharing signals
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// Track rooms: Map<roomCode, Set<socketId>>
const rooms = new Map();
// Track socket->user mapping
const socketUsers = new Map();

/**
 * Authenticate socket connections using JWT
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) return next(new Error('User not found'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Apply JWT middleware to all socket connections
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 User connected: ${user.name} (${socket.id})`);
    socketUsers.set(socket.id, user);

    // ─── Join Meeting Room ──────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomCode }) => {
      socket.join(roomCode);

      // Track room membership
      if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
      rooms.get(roomCode).set(socket.id, user);

      // Notify others in room
      socket.to(roomCode).emit('user-joined', {
        socketId: socket.id,
        user,
        timestamp: new Date().toISOString(),
      });

      // Send current participants to the new joiner
      const participants = Array.from(rooms.get(roomCode).entries()).map(
        ([sid, u]) => ({ socketId: sid, user: u })
      );
      socket.emit('room-participants', { participants });

      console.log(`👥 ${user.name} joined room: ${roomCode}`);
    });

    // ─── WebRTC Signaling ───────────────────────────────────────────────────────
    // Relay offer to specific peer
    socket.on('webrtc-offer', ({ targetSocketId, offer, roomCode }) => {
      io.to(targetSocketId).emit('webrtc-offer', {
        fromSocketId: socket.id,
        fromUser: user,
        offer,
      });
    });

    // Relay answer to specific peer
    socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc-answer', {
        fromSocketId: socket.id,
        answer,
      });
    });

    // Relay ICE candidates for NAT traversal
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    // ─── Media State Changes ────────────────────────────────────────────────────
    socket.on('media-state', ({ roomCode, videoEnabled, audioEnabled }) => {
      socket.to(roomCode).emit('peer-media-state', {
        socketId: socket.id,
        videoEnabled,
        audioEnabled,
      });
    });

    // ─── Screen Sharing ─────────────────────────────────────────────────────────
    socket.on('screen-share-started', ({ roomCode }) => {
      socket.to(roomCode).emit('peer-screen-share-started', {
        socketId: socket.id,
        user,
      });
    });

    socket.on('screen-share-stopped', ({ roomCode }) => {
      socket.to(roomCode).emit('peer-screen-share-stopped', {
        socketId: socket.id,
      });
    });

    // ─── Chat Messages ──────────────────────────────────────────────────────────
    socket.on('chat-message', async ({ roomCode, meetingId, content }) => {
      if (!content || !content.trim()) return;

      try {
        // Save message to PostgreSQL
        const message = await prisma.message.create({
          data: {
            senderId: user.id,
            meetingId,
            content: content.trim(),
            type: 'text',
          },
          include: { sender: { select: { id: true, name: true } } },
        });

        // Broadcast to all in room (including sender)
        io.to(roomCode).emit('chat-message', {
          id: message.id,
          sender: message.sender,
          content: message.content,
          timestamp: message.timestamp,
        });
      } catch (err) {
        console.error('Message save error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ─── Whiteboard Events ──────────────────────────────────────────────────────
    // Relay draw events to all peers in room
    socket.on('whiteboard-draw', ({ roomCode, drawData }) => {
      socket.to(roomCode).emit('whiteboard-draw', {
        drawData,
        user: { id: user.id, name: user.name },
      });
    });

    socket.on('whiteboard-clear', ({ roomCode }) => {
      socket.to(roomCode).emit('whiteboard-clear');
    });

    socket.on('whiteboard-undo', ({ roomCode }) => {
      socket.to(roomCode).emit('whiteboard-undo', { socketId: socket.id });
    });

    // ─── File Shared Notification ───────────────────────────────────────────────
    socket.on('file-shared', ({ roomCode, file }) => {
      socket.to(roomCode).emit('file-shared', { file, sharedBy: user });
    });

    // ─── Leave Room / Disconnect ────────────────────────────────────────────────
    const handleLeave = (roomCode) => {
      if (roomCode && rooms.has(roomCode)) {
        rooms.get(roomCode).delete(socket.id);
        if (rooms.get(roomCode).size === 0) rooms.delete(roomCode);
      }
      socket.to(roomCode).emit('user-left', {
        socketId: socket.id,
        user,
      });
    };

    socket.on('leave-room', ({ roomCode }) => {
      handleLeave(roomCode);
      socket.leave(roomCode);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.name} (${socket.id})`);
      socketUsers.delete(socket.id);
      // Notify all rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room !== socket.id) handleLeave(room);
      });
    });
  });

  return io;
};

module.exports = { initSocketServer };
