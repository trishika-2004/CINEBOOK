const Theatre = require('../models/Theatre');

// @desc    Get all theatres
// @route   GET /api/theatres
// @access  Public
exports.getAllTheaters = async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = { isActive: true };
    
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    const theatres = await Theatre.find(query).populate('owner', 'name email');

    res.status(200).json({
      success: true,
      count: theatres.length,
      data: theatres
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single theatre
// @route   GET /api/theatres/:id
// @access  Public
exports.getTheater = async (req, res) => {
  try {
    const theatre = await Theatre.findById(req.params.id).populate('owner', 'name email');

    if (!theatre) {
      return res.status(404).json({
        success: false,
        message: 'Theatre not found'
      });
    }

    res.status(200).json({
      success: true,
      data: theatre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create theatre
// @route   POST /api/theatres
// @access  Private/Theatre-Owner
exports.createTheater = async (req, res) => {
  try {
    req.body.owner = req.user.id;
    const theatre = await Theatre.create(req.body);

    res.status(201).json({
      success: true,
      data: theatre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update theatre
// @route   PUT /api/theatres/:id
// @access  Private/Owner
exports.updateTheater = async (req, res) => {
  try {
    let theatre = await Theatre.findById(req.params.id);

    if (!theatre) {
      return res.status(404).json({
        success: false,
        message: 'Theatre not found'
      });
    }

    // Make sure user is theatre owner
    if (theatre.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this theatre'
      });
    }

    theatre = await Theatre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: theatre
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete theatre
// @route   DELETE /api/theatres/:id
// @access  Private/Owner
exports.deleteTheater = async (req, res) => {
  try {
    const theatre = await Theatre.findById(req.params.id);

    if (!theatre) {
      return res.status(404).json({
        success: false,
        message: 'Theatre not found'
      });
    }

    // Make sure user is theatre owner
    if (theatre.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this theatre'
      });
    }

    await Theatre.findByIdAndUpdate(req.params.id, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Theatre deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};