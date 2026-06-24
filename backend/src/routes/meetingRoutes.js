/**
 * Meeting Routes
 */

const express = require('express');
const { body } = require('express-validator');
const {
  createMeeting, getMeeting, joinMeeting, leaveMeeting, listMeetings
} = require('../controllers/meetingController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

// All meeting routes require authentication
router.use(authenticate);

router.get('/', listMeetings);
router.post('/', [body('title').optional().trim().isLength({ max: 100 })], validate, createMeeting);
router.get('/:roomCode', getMeeting);
router.post('/:roomCode/join', joinMeeting);
router.post('/:roomCode/leave', leaveMeeting);

module.exports = router;
