/**
 * Meeting Controller
 * Create, join, list, and manage meeting rooms
 */

const { prisma } = require('../config/database');
const { generateRoomCode } = require('../utils/helpers');

/**
 * POST /api/meetings
 * Create a new meeting room
 */
const createMeeting = async (req, res, next) => {
  try {
    const { title } = req.body;
    const roomCode = generateRoomCode(); // e.g., "ABC-123-XYZ"

    const meeting = await prisma.meeting.create({
      data: {
        roomCode,
        title: title || 'Untitled Meeting',
        hostId: req.user.id,
        // Auto-add host as participant
        participants: {
          create: { userId: req.user.id },
        },
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json({ message: 'Meeting created', meeting });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/meetings/:roomCode
 * Get meeting details by room code
 */
const getMeeting = async (req, res, next) => {
  try {
    const { roomCode } = req.params;

    const meeting = await prisma.meeting.findUnique({
      where: { roomCode },
      include: {
        host: { select: { id: true, name: true, email: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true } } },
        },
        messages: {
          include: { sender: { select: { id: true, name: true } } },
          orderBy: { timestamp: 'asc' },
          take: 50, // Last 50 messages
        },
        files: {
          include: { uploader: { select: { id: true, name: true } } },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }

    res.json({ meeting });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/meetings/:roomCode/join
 * Join an existing meeting
 */
const joinMeeting = async (req, res, next) => {
  try {
    const { roomCode } = req.params;

    const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found.' });
    }
    if (!meeting.isActive) {
      return res.status(400).json({ error: 'This meeting has ended.' });
    }

    // Upsert participant (handles re-joining)
    await prisma.participant.upsert({
      where: { userId_meetingId: { userId: req.user.id, meetingId: meeting.id } },
      update: { leftAt: null, joinedAt: new Date() },
      create: { userId: req.user.id, meetingId: meeting.id },
    });

    res.json({ message: 'Joined meeting', meetingId: meeting.id, roomCode });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/meetings/:roomCode/leave
 * Leave a meeting (mark left_at)
 */
const leaveMeeting = async (req, res, next) => {
  try {
    const { roomCode } = req.params;

    const meeting = await prisma.meeting.findUnique({ where: { roomCode } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    await prisma.participant.updateMany({
      where: { userId: req.user.id, meetingId: meeting.id },
      data: { leftAt: new Date() },
    });

    // If host left, end the meeting
    if (meeting.hostId === req.user.id) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { isActive: false, endedAt: new Date() },
      });
    }

    res.json({ message: 'Left meeting' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/meetings
 * List meetings for current user
 */
const listMeetings = async (req, res, next) => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        host: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ meetings });
  } catch (error) {
    next(error);
  }
};

module.exports = { createMeeting, getMeeting, joinMeeting, leaveMeeting, listMeetings };
