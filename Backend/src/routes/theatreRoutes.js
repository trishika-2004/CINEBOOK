const express = require('express');
const router = express.Router();
const Theater = require('../models/Theatre');
const authMiddleware = require('../Middleware/auth');

// Get all theaters
router.get('/', authMiddleware, async (req, res) => {
  try {
    const theaters = await Theater.find().select('-seats');
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get theater by ID with seat availability
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Count available seats
    let availableSeats = 0;
    theater.seats.forEach(row => {
      row.forEach(seat => {
        if (seat === 'available') availableSeats++;
      });
    });

    res.json({
      ...theater.toObject(),
      availableSeats
    });
  } catch (error) {
    console.error('Error fetching theater:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new theater (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const theater = new Theater(req.body);
    await theater.save();
    
    console.log('Theater created:', theater.name);
    res.status(201).json(theater);
  } catch (error) {
    console.error('Error creating theater:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;