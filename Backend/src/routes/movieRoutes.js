const express = require('express');
const {
  getAllMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  addReview
} = require('../Controllers/movieController');

const { protect, authorize } = require('../Middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllMovies);
router.get('/:id', getMovie);

// Admin routes
router.post('/', protect, authorize('admin'), createMovie);
router.put('/:id', protect, authorize('admin'), updateMovie);
router.delete('/:id', protect, authorize('admin'), deleteMovie);

// Review routes
router.post('/:id/reviews', protect, addReview);

module.exports = router;