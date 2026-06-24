/**
 * Message Controller
 * Retrieve chat messages for a meeting
 */

const { prisma } = require('../config/database');

/**
 * GET /api/messages/:meetingId
 * Fetch messages for a meeting (paginated)
 */
const getMessages = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { cursor, limit = 50 } = req.query;

    // Verify user is a participant
    const participant = await prisma.participant.findFirst({
      where: { userId: req.user.id, meetingId },
    });
    if (!participant) {
      return res.status(403).json({ error: 'Not a participant of this meeting.' });
    }

    const messages = await prisma.message.findMany({
      where: { meetingId },
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: parseInt(limit),
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMessages };
