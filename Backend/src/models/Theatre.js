const mongoose = require('mongoose');

const theaterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide theater name'],
    trim: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  screens: [{
    screenNumber: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    totalSeats: {
      type: Number,
      required: true
    },
    seatLayout: {
      rows: Number,
      columns: Number,
      seatTypes: [{
        type: {
          type: String, // 'Regular', 'Premium', 'Recliner'
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        seats: [String] // e.g., ['A1', 'A2', 'A3']
      }]
    }
  }],
  amenities: [String], // ['Parking', 'Food Court', 'Wheelchair Access']
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Theater', theaterSchema);