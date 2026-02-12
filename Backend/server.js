import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import prisma from './src/config/prisma.js';

// Import routes
import adminRoutes from './src/routes/adminRoutes.js';
import theatreRoutes from './src/routes/theatreRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import profileRoutes from './src/routes/profileRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Test database connection
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
}

testConnection();

// Routes
app.use('/api/admin', adminRoutes);        // Admin Dashboard Routes
app.use('/api/profile', profileRoutes);    // Profile Routes
app.use('/api/theatres', theatreRoutes);   // Theater Routes
app.use('/api/bookings', bookingRoutes);   // Booking Routes

app.get('/', (req, res) => {
  res.json({ 
    message: 'Theatre Booking API running with PostgreSQL + Supabase Auth',
    endpoints: {
      admin: '/api/admin',
      profile: '/api/profile',
      theaters: '/api/theatres',
      bookings: '/api/bookings'
    }
  });
});

// ============ SOCKET.IO - REAL-TIME SEAT LOCKING ============

const lockedSeats = {};

function getSeatKey(row, seat) {
  return `${row}-${seat}`;
}

function unlockSeat(theatreId, seatKey) {
  if (lockedSeats[theatreId] && lockedSeats[theatreId][seatKey]) {
    const { timeout } = lockedSeats[theatreId][seatKey];
    if (timeout) clearTimeout(timeout);
    delete lockedSeats[theatreId][seatKey];
    return true;
  }
  return false;
}

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Join theater room
  socket.on('join-theater', ({ theaterId, userId, username }) => {
    socket.join(theaterId);
    socket.theaterId = theaterId;
    socket.userId = userId;
    socket.username = username;

    console.log(`🎬 ${username} joined theatre ${theaterId}`);

    // Send current locked seats to new user
    if (lockedSeats[theaterId]) {
      const currentLocks = {};
      Object.keys(lockedSeats[theaterId]).forEach(seatKey => {
        const lock = lockedSeats[theaterId][seatKey];
        currentLocks[seatKey] = {
          userId: lock.userId,
          username: lock.username
        };
      });
      socket.emit('current-locks', currentLocks);
    }
  });

  // Lock seats
  socket.on('lock-seats', ({ theaterId, seats, userId, username }) => {
    if (!lockedSeats[theaterId]) {
      lockedSeats[theaterId] = {};
    }

    const lockedSeatsList = [];

    seats.forEach(({ row, seat }) => {
      const seatKey = getSeatKey(row, seat);

      // Only lock if seat is not locked by another user
      if (!lockedSeats[theaterId][seatKey] || lockedSeats[theaterId][seatKey].userId === userId) {
        // Clear existing timeout if re-locking
        if (lockedSeats[theaterId][seatKey]?.timeout) {
          clearTimeout(lockedSeats[theaterId][seatKey].timeout);
        }

        // Auto-unlock after 2 minutes
        const timeout = setTimeout(() => {
          unlockSeat(theaterId, seatKey);
          io.to(theaterId).emit('seat-unlocked', { seatKey, row, seat });
          console.log(`⏰ Auto-unlocked seat ${seatKey} in theatre ${theaterId}`);
        }, 2 * 60 * 1000);

        lockedSeats[theaterId][seatKey] = {
          userId,
          username,
          timestamp: Date.now(),
          timeout
        };

        lockedSeatsList.push({ row, seat, seatKey });
      }
    });

    // Broadcast to all users in theater
    io.to(theaterId).emit('seats-locked', {
      seats: lockedSeatsList,
      userId,
      username
    });

    console.log(`🔒 ${username} locked ${lockedSeatsList.length} seats in theatre ${theaterId}`);
  });

  // Unlock seats
  socket.on('unlock-seats', ({ theaterId, seats, userId }) => {
    if (!lockedSeats[theaterId]) return;

    const unlockedSeats = [];

    seats.forEach(({ row, seat }) => {
      const seatKey = getSeatKey(row, seat);
      const lock = lockedSeats[theaterId][seatKey];

      // Only unlock if user owns the lock
      if (lock && lock.userId === userId) {
        unlockSeat(theaterId, seatKey);
        unlockedSeats.push({ row, seat, seatKey });
      }
    });

    // Broadcast unlock to all users
    io.to(theaterId).emit('seats-unlocked', {
      seats: unlockedSeats,
      userId
    });

    console.log(`🔓 User ${userId} unlocked ${unlockedSeats.length} seats in theatre ${theaterId}`);
  });

  // Clear locks after successful booking
  socket.on('booking-completed', ({ theaterId, userId }) => {
    if (!lockedSeats[theaterId]) return;

    const clearedSeats = [];

    Object.keys(lockedSeats[theaterId]).forEach(seatKey => {
      const lock = lockedSeats[theaterId][seatKey];
      if (lock.userId === userId) {
        const [row, seat] = seatKey.split('-').map(Number);
        unlockSeat(theaterId, seatKey);
        clearedSeats.push({ row, seat, seatKey });
      }
    });

    console.log(`✅ Cleared ${clearedSeats.length} locked seats after booking completion`);
  });

  // Handle disconnect - auto-unlock user's seats
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);

    const { theaterId, userId } = socket;
    if (theaterId && userId && lockedSeats[theaterId]) {
      const clearedSeats = [];

      Object.keys(lockedSeats[theaterId]).forEach(seatKey => {
        const lock = lockedSeats[theaterId][seatKey];
        if (lock.userId === userId) {
          const [row, seat] = seatKey.split('-').map(Number);
          unlockSeat(theaterId, seatKey);
          clearedSeats.push({ row, seat, seatKey });
        }
      });

      if (clearedSeats.length > 0) {
        io.to(theaterId).emit('seats-unlocked', {
          seats: clearedSeats,
          userId
        });
        console.log(`🔓 Auto-unlocked ${clearedSeats.length} seats on disconnect`);
      }
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⚡ Socket.IO enabled for real-time seat locking`);
  console.log(`🔐 Using Supabase Authentication`);
  console.log(`👤 Profile management enabled`);
  console.log(`📄 Pagination & Sorting enabled`);
  console.log(`📊 Admin Dashboard enabled`);
  console.log(`🎬 Theater Booking API ready!`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});