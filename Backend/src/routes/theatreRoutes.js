const express = require('express');
const {
  getAllTheaters,
  getTheater,
  createTheater,
  updateTheater,
  deleteTheater
} = require('../Controllers/theatreController');

const { protect, authorize } = require('../Middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllTheaters);
router.get('/:id', getTheater);

// Protected routes
router.post('/', protect, authorize('admin', 'theater-owner'), createTheater);
router.put('/:id', protect, updateTheater);
router.delete('/:id', protect, deleteTheater);

module.exports = router;