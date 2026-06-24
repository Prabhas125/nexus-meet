/**
 * File Upload Routes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { uploadFile, getMeetingFiles } = require('../controllers/fileController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    // Use UUID to prevent filename collisions
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// File filter - allow common file types
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/', 'video/', 'audio/',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'text/plain',
    'application/zip',
  ];
  const isAllowed = allowed.some(type => file.mimetype.startsWith(type) || file.mimetype === type);
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 }, // 10MB default
});

// Routes
router.use(authenticate);
router.post('/upload/:meetingId', upload.single('file'), uploadFile);
router.get('/:meetingId', getMeetingFiles);

module.exports = router;
