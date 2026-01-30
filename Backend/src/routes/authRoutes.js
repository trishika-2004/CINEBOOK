const express = require('express');
const {
  register,
  login,
  getMe,
  updateDetails
} = require('../Controllers/authController');

const { protect } = require('../Middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/updatedetails', protect, updateDetails);

module.exports = router;