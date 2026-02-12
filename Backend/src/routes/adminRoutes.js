import express from 'express';
import prisma from '../config/prisma.js';
import { verifySupabaseAuth } from '../Middleware/supabaseAuth.js';

const router = express.Router();


const requireAdmin = (req, res, next) => {
  const userRole = req.user.user_metadata?.role;
  if (userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

router.get('/dashboard/stats', verifySupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const [
      totalBookings,
      totalTheaters,
      
      monthlyBookings,
      weeklyBookings,
      todayBookings,
      
      theaterStats,
      
      recentBookings,
      
      weeklyTrend,
      
      totalSeatsData,
      bookedSeatsData,
      
      avgSeats
    ] = await Promise.all([
      prisma.booking.count(),
      
      prisma.theater.count(),
      
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      prisma.theater.findMany({
        select: {
          id: true,
          name: true,
          totalSeats: true,
          seats: true,
          _count: {
            select: { bookings: true }
          }
        },
        orderBy: {
          bookings: {
            _count: 'desc'
          }
        }
      }),
      
      
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingId: true,
          numberOfSeats: true,
          createdAt: true,
          theater: {
            select: { name: true }
          }
        }
      }),
      
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::int as count
        FROM "Booking"
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      
      prisma.theater.aggregate({
        _sum: { totalSeats: true }
      }),
      
      
      prisma.$queryRaw`
        SELECT 
          SUM(
            jsonb_array_length(seats) * 
            jsonb_array_length(seats->0)
          )::int as total_seats,
          SUM(
            (
              SELECT COUNT(*)::int
              FROM jsonb_array_elements(seats) row_elem,
                   jsonb_array_elements(row_elem) seat
              WHERE seat::text = '"booked"'
            )
          )::int as booked_seats
        FROM "Theater"
      `,
      
      
      prisma.booking.aggregate({
        _avg: { numberOfSeats: true }
      })
    ]);

    const totalSeatsAvailable = totalSeatsData._sum.totalSeats || 0;
    const bookedSeatsCount = bookedSeatsData[0]?.booked_seats || 0;
    const occupancyRate = totalSeatsAvailable > 0 
      ? ((bookedSeatsCount / totalSeatsAvailable) * 100).toFixed(1)
      : 0;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      last7Days.push(date.toISOString().split('T')[0]);
    }

    const weeklyTrendMap = {};
    last7Days.forEach(date => {
      weeklyTrendMap[date] = 0;
    });

    weeklyTrend.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0];
      if (weeklyTrendMap[dateKey] !== undefined) {
        weeklyTrendMap[dateKey] = item.count;
      }
    });

    const formattedWeeklyTrend = Object.entries(weeklyTrendMap).map(([date, bookings]) => ({
      date,
      bookings
    }));

    
    const topTheaters = theaterStats.slice(0, 5).map(t => ({
      id: t.id,
      name: t.name,
      bookings: t._count.bookings,
      totalSeats: t.totalSeats
    }));

    res.json({
      overview: {
        totalBookings,
        monthlyBookings,
        weeklyBookings,
        todayBookings,
        totalTheaters,
        totalSeatsAvailable,
        totalSeatsBooked: bookedSeatsCount,
        occupancyRate: parseFloat(occupancyRate),
        avgSeatsPerBooking: parseFloat(avgSeats._avg.numberOfSeats?.toFixed(1) || 0)
      },
      topTheaters,
      recentBookings: recentBookings.map(b => ({
        id: b.id,
        bookingId: b.bookingId,
        theater: b.theater.name,
        seats: b.numberOfSeats,
        date: b.createdAt
      })),
      weeklyTrend: formattedWeeklyTrend
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: error.message });
  }
});


router.get('/dashboard/users', verifySupabaseAuth, requireAdmin, async (req, res) => {
  try {
    const [uniqueUsersCount, activeUsersCount, topUsersByBookings] = await Promise.all([
      
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "Booking"
      `,
      
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "Booking"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      `,
      
      prisma.$queryRaw`
        SELECT 
          "userId",
          COUNT(*)::int as bookings
        FROM "Booking"
        GROUP BY "userId"
        ORDER BY bookings DESC
        LIMIT 5
      `
    ]);

    const totalUsers = uniqueUsersCount[0]?.count || 0;
    const activeUsers = activeUsersCount[0]?.count || 0;

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      topUsers: topUsersByBookings.map(u => ({
        userId: u.userId.substring(0, 8) + '...',
        bookings: u.bookings
      }))
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: error.message });
  }
});


router.get('/dashboard/revenue', verifySupabaseAuth, requireAdmin, async (req, res) => {
  try {
    
    const SEAT_PRICE = 200;

    const [revenueStats] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          COUNT(*)::int as total_bookings,
          SUM("numberOfSeats")::int as total_seats_sold,
          SUM("numberOfSeats" * ${SEAT_PRICE})::int as total_revenue,
          SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN "numberOfSeats" * ${SEAT_PRICE} ELSE 0 END)::int as monthly_revenue,
          SUM(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN "numberOfSeats" * ${SEAT_PRICE} ELSE 0 END)::int as weekly_revenue,
          SUM(CASE WHEN "createdAt" >= CURRENT_DATE THEN "numberOfSeats" * ${SEAT_PRICE} ELSE 0 END)::int as today_revenue
        FROM "Booking"
      `
    ]);

    const stats = revenueStats[0];

    res.json({
      seatPrice: SEAT_PRICE,
      totalRevenue: stats.total_revenue || 0,
      monthlyRevenue: stats.monthly_revenue || 0,
      weeklyRevenue: stats.weekly_revenue || 0,
      todayRevenue: stats.today_revenue || 0,
      totalSeatsSold: stats.total_seats_sold || 0,
      avgRevenuePerBooking: stats.total_bookings > 0 
        ? Math.round((stats.total_revenue || 0) / stats.total_bookings)
        : 0
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
