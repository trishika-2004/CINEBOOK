const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const userRoutes = require('./src/routes/userRoutes');
const theatreRoutes = require('./src/routes/theatreRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/theatre-booking')
  .then(() => console.log(' MongoDB connected'))
  .catch(err => console.error(' MongoDB connection error:', err));

app.use('/api/users', userRoutes);
app.use('/api/theatres', theatreRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Theatre Booking API running' });
});


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
  console.log(' User connected:', socket.id);

  
  socket.on('join-theater', ({ theaterId, userId, username }) => {
    socket.join(theaterId);
    socket.theaterId = theaterId;
    socket.userId = userId;
    socket.username = username;

    console.log(` ${username} joined theatre ${theaterId}`);

    
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

  
  socket.on('lock-seats', ({ theaterId, seats, userId, username }) => {
    if (!lockedSeats[theaterId]) {
      lockedSeats[theaterId] = {};
    }

    const lockedSeatsList = [];

    seats.forEach(({ row, seat }) => {
      const seatKey = getSeatKey(row, seat);
      
      
      if (!lockedSeats[theaterId][seatKey] || lockedSeats[theaterId][seatKey].userId === userId) {
        
        if (lockedSeats[theaterId][seatKey]?.timeout) {
          clearTimeout(lockedSeats[theaterId][seatKey].timeout);
        }

        
        const timeout = setTimeout(() => {
          unlockSeat(theaterId, seatKey);
          io.to(theaterId).emit('seat-unlocked', { seatKey, row, seat });
          console.log(`Auto-unlocked seat ${seatKey} in theatre ${theaterId}`);
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

    
    io.to(theaterId).emit('seats-locked', {
      seats: lockedSeatsList,
      userId,
      username
    });

    console.log(` ${username} locked ${lockedSeatsList.length} seats in theatre ${theaterId}`);
  });

  
  socket.on('unlock-seats', ({ theaterId, seats, userId }) => {
    if (!lockedSeats[theaterId]) return;

    const unlockedSeats = [];

    seats.forEach(({ row, seat }) => {
      const seatKey = getSeatKey(row, seat);
      const lock = lockedSeats[theaterId][seatKey];

      
      if (lock && lock.userId === userId) {
        unlockSeat(theaterId, seatKey);
        unlockedSeats.push({ row, seat, seatKey });
      }
    });

    
    io.to(theaterId).emit('seats-unlocked', {
      seats: unlockedSeats,
      userId
    });

    console.log(` User ${userId} unlocked ${unlockedSeats.length} seats in theatre ${theaterId}`);
  });

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

    console.log(` Cleared ${clearedSeats.length} locked seats after booking completion`);
  });

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
        console.log(` Auto-unlocked ${clearedSeats.length} seats on disconnect`);
      }
    }
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Socket.IO enabled for real-time seat locking`);
});