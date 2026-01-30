const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: true
  },
  screen: {
    screenNumber: {
      type: Number,
      required: true
    },
    name: String
  },
  showDate: {
    type: Date,
    required: true
  },
  showTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    required: true
  },
  pricing: [{
    seatType: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    }
  }],
  availableSeats: [{
    seatNumber: String,
    seatType: String,
    isBooked: {
      type: Boolean,
      default: false
    }
  }],
  totalSeats: {
    type: Number,
    required: true
  },
  bookedSeats: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'booking-open', 'full', 'cancelled', 'completed'],
    default: 'upcoming'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
showSchema.index({ movie: 1, theater: 1, showDate: 1 });

module.exports = mongoose.model('Show', showSchema);