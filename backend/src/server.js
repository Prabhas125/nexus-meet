/**
 * NexusMeet - Main Server Entry Point
 * Express + Socket.io + PostgreSQL (Prisma)
 */

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocketServer } = require('./services/socketService');
const { prisma } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io with the HTTP server
initSocketServer(server);

// Connect to PostgreSQL and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');

    server.listen(PORT, () => {
      console.log(`🚀 NexusMeet Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

startServer();
