import express from 'express';
import prisma from '../config/prisma.js';
import { verifySupabaseAuth } from '../Middleware/supabaseAuth.js';

const router = express.Router();

// Get all theaters
router.get('/', verifySupabaseAuth, async (req, res) => {
  try {
    const theaters = await prisma.theater.findMany({
      select: {
        id: true,
        name: true,
        totalSeats: true,
        rows: true,
        seatsPerRow: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get theater by ID with seat availability
router.get('/:id', verifySupabaseAuth, async (req, res) => {
  try {
    const theater = await prisma.theater.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Count available seats
    let availableSeats = 0;
    const seats = theater.seats;

    seats.forEach(row => {
      row.forEach(seat => {
        if (seat === 'available') availableSeats++;
      });
    });

    res.json({
      ...theater,
      availableSeats
    });
  } catch (error) {
    console.error('Error fetching theater:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new theater (admin only)
router.post('/', verifySupabaseAuth, async (req, res) => {
  try {
    // Check if user is admin (from Supabase user_metadata)
    const userRole = req.user.user_metadata?.role;
    
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, totalSeats, rows, seatsPerRow } = req.body;

    // Generate initial seat grid
    const seatGrid = [];
    const rowCount = rows || 10;
    const seatsPerRowCount = seatsPerRow || 10;

    for (let i = 0; i < rowCount; i++) {
      const row = [];
      for (let j = 0; j < seatsPerRowCount; j++) {
        row.push('available');
      }
      seatGrid.push(row);
    }

    const theater = await prisma.theater.create({
      data: {
        name,
        totalSeats: totalSeats || 100,
        rows: rowCount,
        seatsPerRow: seatsPerRowCount,
        seats: seatGrid
      }
    });

    console.log('✅ Theater created:', theater.name);
    res.status(201).json(theater);
  } catch (error) {
    console.error('❌ Error creating theater:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;