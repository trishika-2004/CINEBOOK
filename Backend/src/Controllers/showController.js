const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');


const generateSeats = (rows, columns) => {
  const seats = [];
  for (let i = 0; i < rows; i++) {
    const rowLetter = String.fromCharCode(65 + i); // A, B, C, etc.
    for (let j = 1; j <= columns; j++) {
      seats.push(`${rowLetter}${j}`);
    }
  }
  return seats;
};


exports.getShows = async (req, res) => {
  try {
    const { movieId, theaterId, date, city } = req.query;
    
    let query = { status: 'active' };

    
    if (movieId) {
      query.movie = movieId;
    }

    
    if (theaterId) {
      query.theater = theaterId;
    }

    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.showDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    let shows = await Show.find(query)
      .populate('movie', 'title posterUrl duration rating language')
      .populate('theater', 'name location')
      .sort({ showDate: 1, showTime: 1 });

    
    if (city) {
      shows = shows.filter(show => 
        show.theater.location.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    res.status(200).json({
      success: true,
      count: shows.length,
      data: shows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getShow = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie')
      .populate('theater');

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found'
      });
    }

    res.status(200).json({
      success: true,
      data: show
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.createShow = async (req, res) => {
  try {
    const { movie, theater, screenNumber, showDate, showTime, pricing } = req.body;

    
    const movieExists = await Movie.findById(movie);
    if (!movieExists) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    
    const theaterExists = await Theater.findById(theater);
    if (!theaterExists) {
      return res.status(404).json({
        success: false,
        message: 'Theater not found'
      });
    }

    
    const screen = theaterExists.screens.find(s => s.screenNumber === screenNumber);
    if (!screen) {
      return res.status(404).json({
        success: false,
        message: 'Screen not found in theater'
      });
    }

    
    const availableSeats = generateSeats(
      screen.seatLayout.rows, 
      screen.seatLayout.columns
    );

    const show = await Show.create({
      movie,
      theater,
      screenNumber,
      showDate,
      showTime,
      pricing: pricing || {
        normal: 150,
        premium: 200,
        vip: 300
      },
      totalSeats: availableSeats.length,
      availableSeats,
      bookedSeats: []
    });

    const populatedShow = await Show.findById(show._id)
      .populate('movie')
      .populate('theater');

    res.status(201).json({
      success: true,
      data: populatedShow
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


exports.updateShow = async (req, res) => {
  try {
    const show = await Show.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found'
      });
    }

    res.status(200).json({
      success: true,
      data: show
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};


exports.deleteShow = async (req, res) => {
  try {
    const show = await Show.findByIdAndDelete(req.params.id);

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {},
      message: 'Show deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getShowSeats = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('theater');

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found'
      });
    }

    
    const screen = show.theater.screens.find(s => s.screenNumber === show.screenNumber);

    res.status(200).json({
      success: true,
      data: {
        availableSeats: show.availableSeats,
        bookedSeats: show.bookedSeats,
        totalSeats: show.totalSeats,
        seatLayout: screen.seatLayout,
        pricing: show.pricing
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};