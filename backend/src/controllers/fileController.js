/**
 * File Upload Controller
 * Handle file uploads/downloads for meeting rooms
 */

const path = require('path');
const { prisma } = require('../config/database');

/**
 * POST /api/files/upload/:meetingId
 * Upload a file to a meeting
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { meetingId } = req.params;

    // Verify meeting exists and user is a participant
    const participant = await prisma.participant.findFirst({
      where: { userId: req.user.id, meetingId },
    });
    if (!participant) {
      return res.status(403).json({ error: 'Not a participant of this meeting.' });
    }

    // Build the public URL for the file
    const fileUrl = `/uploads/${req.file.filename}`;

    // Save file record to database
    const file = await prisma.file.create({
      data: {
        uploaderId: req.user.id,
        meetingId,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ message: 'File uploaded successfully', file });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:meetingId
 * List all files for a meeting
 */
const getMeetingFiles = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const files = await prisma.file.findMany({
      where: { meetingId },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json({ files });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadFile, getMeetingFiles };
