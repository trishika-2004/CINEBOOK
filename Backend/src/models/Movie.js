const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide movie title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide movie description']
  },
  genre: [{
    type: String,
    required: true
  }],
  language: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  releaseDate: {
    type: Date,
    required: true
  },
  poster: {
    type: String, // URL to poster image
    required: true
  },
  trailer: {
    type: String // YouTube URL
  },
  cast: [{
    name: String,
    role: String,
    image: String
  }],
  director: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Movie', movieSchema);