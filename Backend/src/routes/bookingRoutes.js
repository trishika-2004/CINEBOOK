import express from 'express';
import prisma from '../config/prisma.js';
import { verifySupabaseAuth } from '../Middleware/supabaseAuth.js';

const router = express.Router();

// Get user's bookings for specific theater
router.get('/user/:userId/theater/:theaterId', verifySupabaseAuth, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.params.userId,
        theaterId: parseInt(req.params.theaterId)
      },
      include: {
        theater: true
      }
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get my bookings with pagination and sorting
router.get('/my-bookings', verifySupabaseAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: req.user.id },
        skip,
        take,
        orderBy,
        include: { theater: true }
      }),
      prisma.booking.count({ where: { userId: req.user.id } })
    ]);

    res.json({
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: error.message });
  }
});

// Seat finding function (unchanged)
function findSeatsMultipleRows(seats, numberOfSeats) {
  const seatNumbers = [];
  let seatsNeeded = numberOfSeats;

  console.log(`\n=== BOOKING REQUEST ===`);
  console.log(`Seats requested: ${numberOfSeats}`);

  for (let row = 0; row < seats.length && seatsNeeded > 0; row++) {
    let consecutiveStart = -1;
    let consecutiveCount = 0;
    let maxConsecutive = 0;
    let maxConsecutiveStart = -1;

    for (let seat = 0; seat < seats[row].length; seat++) {
      if (seats[row][seat] === 'available') {
        if (consecutiveStart === -1) {
          consecutiveStart = seat;
        }
        consecutiveCount++;

        if (consecutiveCount > maxConsecutive) {
          maxConsecutive = consecutiveCount;
          maxConsecutiveStart = consecutiveStart;
        }
      } else {
        consecutiveStart = -1;
        consecutiveCount = 0;
      }
    }

    if (maxConsecutive > 0) {
      const seatsToBook = Math.min(seatsNeeded, maxConsecutive);

      console.log(`Row ${row + 1}: Found ${maxConsecutive} consecutive seats at position ${maxConsecutiveStart + 1}, booking ${seatsToBook} seats`);

      for (let i = 0; i < seatsToBook; i++) {
        seatNumbers.push({
          row: row,
          seat: maxConsecutiveStart + i
        });
      }

      seatsNeeded -= seatsToBook;
      console.log(`Remaining seats needed: ${seatsNeeded}`);
    }
  }

  if (seatsNeeded > 0) {
    console.log(`❌ FAILED: Could not find ${seatsNeeded} more consecutive seats`);
    return null;
  }

  console.log(`✅ SUCCESS: Found all ${seatNumbers.length} seats`);
  console.log('Seat allocation:', seatNumbers.map(s => `Row ${s.row + 1} Seat ${s.seat + 1}`).join(', '));
  console.log(`======================\n`);

  return seatNumbers;
}

// Create booking
router.post('/', verifySupabaseAuth, async (req, res) => {
  try {
    const { theaterId, numberOfSeats } = req.body;
    const userId = req.user.id;

    console.log(`\n📝 New booking request:`);
    console.log(`User ID: ${userId}`);
    console.log(`Theater ID: ${theaterId}`);
    console.log(`Seats requested: ${numberOfSeats}`);

    const theater = await prisma.theater.findUnique({
      where: { id: parseInt(theaterId) }
    });

    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    const seats = theater.seats;

    let availableSeats = 0;
    seats.forEach(row => {
      row.forEach(seat => {
        if (seat === 'available') availableSeats++;
      });
    });

    console.log(`Available seats in theater: ${availableSeats}/${theater.totalSeats}`);

    if (numberOfSeats > availableSeats) {
      console.log(`❌ Not enough seats available`);
      return res.status(400).json({
        message: 'The theater does not have sufficient seats. Please look into other theaters.'
      });
    }

    const seatNumbers = findSeatsMultipleRows(seats, numberOfSeats);

    if (!seatNumbers) {
      console.log(`❌ Cannot find consecutive seats`);
      return res.status(400).json({
        message: 'Cannot book. No consecutive seats available in rows.'
      });
    }

    seatNumbers.forEach(({ row, seat }) => {
      seats[row][seat] = 'booked';
    });

    await prisma.theater.update({
      where: { id: parseInt(theaterId) },
      data: { seats: seats }
    });

    console.log(`✅ Theater seats updated`);

    const booking = await prisma.booking.create({
      data: {
        userId,
        theaterId: parseInt(theaterId),
        numberOfSeats,
        seatNumbers: seatNumbers
      },
      include: {
        theater: true
      }
    });

    console.log(`✅ Booking created: ${booking.bookingId}`);

    res.status(201).json({
      message: 'Booking successful',
      booking,
      seatNumbers
    });
  } catch (error) {
    console.error('❌ Booking error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;