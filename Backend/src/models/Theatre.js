const mongoose = require('mongoose');

const theaterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  totalSeats: {
    type: Number,
    default: 100
  },
  rows: {
    type: Number,
    default: 10
  },
  seatsPerRow: {
    type: Number,
    default: 10
  },
  seats: {
    type: [[String]],
    default: () => {
      const grid = [];
      for (let i = 0; i < 10; i++) {
        const row = [];
        for (let j = 0; j < 10; j++) {
          row.push('available');
        }
        grid.push(row);
      }
      return grid;
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Theater', theaterSchema);