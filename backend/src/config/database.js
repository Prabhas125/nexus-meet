/**
 * Prisma Client - Database Connection Singleton
 * Prevents multiple instances in development (hot reload)
 */

const { PrismaClient } = require('@prisma/client');

// Prevent multiple Prisma instances during hot reload
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
