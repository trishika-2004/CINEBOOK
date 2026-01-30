const express = require('express');
const {
  getAllShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
  getShowSeats
} = require('../Controllers/showController');

const { protect, authorize } = require('../Middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllShows);
router.get('/:id', getShow);
router.get('/:id/seats', getShowSeats);

// Admin routes
router.post('/', protect, authorize('admin'), createShow);
router.put('/:id', protect, authorize('admin'), updateShow);
router.delete('/:id', protect, authorize('admin'), deleteShow);

module.exports = router;