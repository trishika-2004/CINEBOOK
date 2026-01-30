const Theater = require('../models/Theater');

// @desc    Get all theaters
// @route   GET /api/theaters
// @access  Public
exports.getAllTheaters = async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = { isActive: true };
    
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    const theaters = await Theater.find(query).populate('owner', 'name email');

    res.status(200).json({
      success: true,
      count: theaters.length,
      data: theaters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single theater
// @route   GET /api/theaters/:id
// @access  Public
exports.getTheater = async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id).populate('owner', 'name email');

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found'
      });
    }

    res.status(200).json({
      success: true,
      data: theater
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create theater
// @route   POST /api/theaters
// @access  Private/Theater-Owner
exports.createTheater = async (req, res) => {
  try {
    req.body.owner = req.user.id;
    const theater = await Theater.create(req.body);

    res.status(201).json({
      success: true,
      data: theater
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update theater
// @route   PUT /api/theaters/:id
// @access  Private/Owner
exports.updateTheater = async (req, res) => {
  try {
    let theater = await Theater.findById(req.params.id);

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found'
      });
    }

    // Make sure user is theater owner
    if (theater.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this theater'
      });
    }

    theater = await Theater.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: theater
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete theater
// @route   DELETE /api/theaters/:id
// @access  Private/Owner
exports.deleteTheater = async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);

    if (!theater) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found'
      });
    }

    // Make sure user is theater owner
    if (theater.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this theater'
      });
    }

    await Theater.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Theater deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};