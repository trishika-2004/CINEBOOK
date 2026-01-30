const Booking = require('../models/Booking');
const Show = require('../models/Show');
const QRCode = require('qrcode');


exports.createBooking = async (req, res) => {
  try {
    const { showId, seats, seatDetails, totalAmount } = req.body;

   
    const show = await Show.findById(showId)
      .populate('movie', 'title')
      .populate('theatre', 'name location');

    if (!show) {
      return res.status(404).json({
        success: false,
        message: 'Show not found'
      });
    }

    
    if (show.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Show is not available for booking'
      });
    }

    
    const unavailableSeats = seats.filter(seat => !show.availableSeats.includes(seat));
    
    if (unavailableSeats.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Seats ${unavailableSeats.join(', ')} are not available`
      });
    }

    
    const booking = await Booking.create({
      user: req.user.id,
      show: showId,
      movie: show.movie._id,
      theatre: show.theatre._id,
      seats,
      seatDetails,
      totalAmount,
      bookingStatus: 'confirmed',
      paymentStatus: 'success' 
    });

    
    show.availableSeats = show.availableSeats.filter(seat => !seats.includes(seat));
    show.bookedSeats.push(...seats);
    await show.save();

    
    const qrData = JSON.stringify({
      bookingId: booking._id,
      user: req.user.name,
      movie: show.movie.title,
      theatre: show.theatre.name,
      seats: seats.join(', '),
      showTime: `${show.showDate.toDateString()} ${show.showTime}`,
      amount: totalAmount
    });

    const qrCode = await QRCode.toDataURL(qrData);
    booking.qrCode = qrCode;
    await booking.save();

    
    const populatedBooking = await Booking.findById(booking._id)
      .populate('movie', 'title posterUrl')
      .populate('theatre', 'name location')
      .populate('show', 'showDate showTime');

    res.status(201).json({
      success: true,
      data: populatedBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('movie', 'title posterUrl duration censorRating')
      .populate('theatre', 'name location')
      .populate('show', 'showDate showTime')
      .sort({ bookingDate: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('movie', 'title posterUrl duration censorRating')
      .populate('theatre', 'name location')
      .populate('show', 'showDate showTime pricing');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    
    const show = await Show.findById(booking.show);
    const showDateTime = new Date(`${show.showDate.toDateString()} ${show.showTime}`);
    
    if (new Date() > showDateTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking after show time'
      });
    }

    
    booking.bookingStatus = 'cancelled';
    await booking.save();

    
    show.availableSeats.push(...booking.seats);
    show.bookedSeats = show.bookedSeats.filter(seat => !booking.seats.includes(seat));
    await show.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


exports.getAllBookings = async (req, res) => {
  try {
    const { status, date, movieId, theatreId } = req.query;
    
    let query = {};

    if (status) {
      query.bookingStatus = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.bookingDate = {
        $gte: startDate,
        $lte: endDate
      };
    }

    if (movieId) {
      query.movie = movieId;
    }

    if (theatreId) {
      query.theatre = theatreId;
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('movie', 'title')
      .populate('theatre', 'name location')
      .populate('show', 'showDate showTime')
      .sort({ bookingDate: -1 });

    
    const totalRevenue = bookings
      .filter(b => b.bookingStatus !== 'cancelled')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.bookingStatus === 'confirmed').length;
    const cancelledBookings = bookings.filter(b => b.bookingStatus === 'cancelled').length;

    res.status(200).json({
      success: true,
      count: bookings.length,
      stats: {
        totalRevenue,
        totalBookings,
        confirmedBookings,
        cancelledBookings
      },
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.verifyBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('user', 'name email')
      .populate('movie', 'title')
      .populate('theatre', 'name')
      .populate('show', 'showDate showTime');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This booking has been cancelled',
        valid: false
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        bookingId: booking._id,
        user: booking.user.name,
        movie: booking.movie.title,
        theatre: booking.theatre.name,
        seats: booking.seats,
        showTime: `${booking.show.showDate.toDateString()} ${booking.show.showTime}`,
        status: booking.bookingStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};