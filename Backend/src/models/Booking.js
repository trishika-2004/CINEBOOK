const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    default: function() {
      // Auto-generate unique booking ID
      return `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  theaterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true
  },
  numberOfSeats: {
    type: Number,
    required: true
  },
  seatNumbers: [{
    row: Number,
    seat: Number
  }]
}, { timestamps: true });

// NO unique index on bookingId - allows multiple bookings per user
module.exports = mongoose.model('Booking', bookingSchema);