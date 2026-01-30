const express = require('express');
const {
  getShows,
  getShow,
  createShow,
  updateShow,
  deleteShow,
  getShowSeats
} = require('../controllers/showController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getShows)
  .post(protect, authorize('admin'), createShow);

router.route('/:id')
  .get(getShow)
  .put(protect, authorize('admin'), updateShow)
  .delete(protect, authorize('admin'), deleteShow);

router.get('/:id/seats', getShowSeats);

module.exports = router;