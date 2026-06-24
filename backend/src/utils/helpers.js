/**
 * Utility Helper Functions
 */

/**
 * Generate a human-readable room code like "ABC-123-XYZ"
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment(3)}-${segment(3)}-${segment(3)}`;
};

/**
 * Format file size to human-readable string
 */
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

module.exports = { generateRoomCode, formatFileSize };
