const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const errorHandle = require("./src/Middleware/errorhandle");


dotenv.config();
connectDB();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/movies', require('./src/routes/movieRoutes'));
app.use('/api/theaters', require('./src/routes/theaterRoutes'));
app.use('/api/shows', require('./src/routes/showRoutes'));
app.use('/api/bookings', require('./src/routes/bookingRoutes'));
app.use('/api/payments', require('./src/routes/paymentRoutes'));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Cinebook API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      movies: '/api/movies',
      theaters: '/api/theaters',
      shows: '/api/shows',
      bookings: '/api/bookings',
      payments: '/api/payments'
    }
  });
});


app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Cinebook API server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

module.exports = app;