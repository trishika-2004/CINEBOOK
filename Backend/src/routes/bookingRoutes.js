const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getAllBookings,
  verifyBooking
} = require('../Controllers/bookingController');

const { protect, authorize } = require('../Middleware/auth');

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);

router.get('/admin/all', protect, authorize('admin'), getAllBookings);
router.post('/verify', protect, authorize('admin', 'theater-owner'), verifyBooking);

module.exports = router;