const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Theater = require('../models/Theatre');
const authMiddleware = require('../Middleware/auth');

// Get user's bookings for specific theater
router.get('/user/:userId/theater/:theaterId', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.params.userId,
      theaterId: req.params.theaterId
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * Find consecutive seats across multiple rows
 * Books seats horizontally row by row until all seats are booked
 * @param {Array} seats - 2D array of seat status
 * @param {Number} numberOfSeats - Number of seats to book
 * @returns {Array|null} - Array of seat positions or null if cannot book
 */
function findSeatsMultipleRows(seats, numberOfSeats) {
  const seatNumbers = [];
  let seatsNeeded = numberOfSeats;
  
  console.log(`\n=== BOOKING REQUEST ===`);
  console.log(`Seats requested: ${numberOfSeats}`);
  
  // Go through each row
  for (let row = 0; row < seats.length && seatsNeeded > 0; row++) {
    // Find the longest consecutive sequence of available seats in this row
    let consecutiveStart = -1;
    let consecutiveCount = 0;
    let maxConsecutive = 0;
    let maxConsecutiveStart = -1;
    
    // Scan through the row to find longest consecutive available seats
    for (let seat = 0; seat < seats[row].length; seat++) {
      if (seats[row][seat] === 'available') {
        if (consecutiveStart === -1) {
          consecutiveStart = seat;
        }
        consecutiveCount++;
        
        // Update max if current sequence is longer
        if (consecutiveCount > maxConsecutive) {
          maxConsecutive = consecutiveCount;
          maxConsecutiveStart = consecutiveStart;
        }
      } else {
        // Reset when we hit a booked seat
        consecutiveStart = -1;
        consecutiveCount = 0;
      }
    }
    
    // If we found consecutive seats in this row, book them
    if (maxConsecutive > 0) {
      // Book either all available consecutive seats or only what we need
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
  
  // Check if we successfully booked all requested seats
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
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { theaterId, numberOfSeats } = req.body;
    const userId = req.user.userId;

    console.log(`\n📝 New booking request:`);
    console.log(`User ID: ${userId}`);
    console.log(`Theater ID: ${theaterId}`);
    console.log(`Seats requested: ${numberOfSeats}`);

    // Find theater
    const theater = await Theater.findById(theaterId);
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Count total available seats
    let availableSeats = 0;
    theater.seats.forEach(row => {
      row.forEach(seat => {
        if (seat === 'available') availableSeats++;
      });
    });

    console.log(`Available seats in theater: ${availableSeats}/${theater.totalSeats}`);

    // Check if sufficient seats available
    if (numberOfSeats > availableSeats) {
      console.log(`❌ Not enough seats available`);
      return res.status(400).json({
        message: 'The theater does not have sufficient seats. Please look into other theaters.'
      });
    }

    // Find consecutive seats across rows
    const seatNumbers = findSeatsMultipleRows(theater.seats, numberOfSeats);
    
    if (!seatNumbers) {
      console.log(`❌ Cannot find consecutive seats`);
      return res.status(400).json({
        message: 'Cannot book. No consecutive seats available in rows.'
      });
    }

    // Update theater seats to 'booked'
    seatNumbers.forEach(({ row, seat }) => {
      theater.seats[row][seat] = 'booked';
    });

    await theater.save();
    console.log(`✅ Theater seats updated`);

    // Create booking record
    const booking = new Booking({
      userId,
      theaterId,
      numberOfSeats,
      seatNumbers
    });

    await booking.save();
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

module.exports = router;