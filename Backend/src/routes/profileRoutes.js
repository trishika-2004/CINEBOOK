const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const authMiddleware = require('../Middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Get user profile
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    console.log('GET Profile - req.user.id:', req.user.id);
    console.log('GET Profile - req.params.userId:', req.params.userId);
    
    const user = await User.findById(req.params.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('GET Profile Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/:userId', authMiddleware, async (req, res) => {
  try {
    console.log('UPDATE Profile - req.user.id:', req.user.id);
    console.log('UPDATE Profile - req.params.userId:', req.params.userId);
    
    const { fullName, email, phone, address, dateOfBirth } = req.body;
    
    // Convert both IDs to strings for comparison
    const userIdFromToken = req.user.id.toString();
    const userIdFromParams = req.params.userId.toString();
    
    // Check if user is updating their own profile
    if (userIdFromToken !== userIdFromParams) {
      console.log('Unauthorized: User IDs do not match');
      console.log('Token ID:', userIdFromToken);
      console.log('Params ID:', userIdFromParams);
      return res.status(403).json({ message: 'Unauthorized - You can only update your own profile' });
    }
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateData },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Profile updated successfully');
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('UPDATE Profile Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload profile picture
router.post('/:userId/upload-picture', authMiddleware, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('UPLOAD Picture - req.user.id:', req.user.id);
    console.log('UPLOAD Picture - req.params.userId:', req.params.userId);
    
    // Convert both IDs to strings for comparison
    const userIdFromToken = req.user.id.toString();
    const userIdFromParams = req.params.userId.toString();
    
    // Check if user is updating their own profile
    if (userIdFromToken !== userIdFromParams) {
      return res.status(403).json({ message: 'Unauthorized - You can only update your own profile picture' });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Delete old profile picture if exists
    const user = await User.findById(req.params.userId);
    if (user.profilePicture) {
      const oldPicPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPicPath)) {
        fs.unlinkSync(oldPicPath);
      }
    }
    
    // Save new profile picture path
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;
    user.profilePicture = profilePicturePath;
    await user.save();
    
    console.log('Profile picture uploaded successfully');
    res.json({ 
      message: 'Profile picture uploaded successfully',
      profilePicture: profilePicturePath
    });
  } catch (error) {
    console.error('UPLOAD Picture Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete profile picture
router.delete('/:userId/delete-picture', authMiddleware, async (req, res) => {
  try {
    console.log('DELETE Picture - req.user.id:', req.user.id);
    console.log('DELETE Picture - req.params.userId:', req.params.userId);
    
    // Convert both IDs to strings for comparison
    const userIdFromToken = req.user.id.toString();
    const userIdFromParams = req.params.userId.toString();
    
    // Check if user is deleting their own profile picture
    if (userIdFromToken !== userIdFromParams) {
      return res.status(403).json({ message: 'Unauthorized - You can only delete your own profile picture' });
    }
    
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.profilePicture) {
      const picPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(picPath)) {
        fs.unlinkSync(picPath);
      }
      user.profilePicture = '';
      await user.save();
    }
    
    console.log('Profile picture deleted successfully');
    res.json({ message: 'Profile picture deleted successfully' });
  } catch (error) {
    console.error('DELETE Picture Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;