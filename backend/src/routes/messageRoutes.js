/**
 * Message Routes
 */

const express = require('express');
const { getMessages } = require('../controllers/messageController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/:meetingId', getMessages);

module.exports = router;
