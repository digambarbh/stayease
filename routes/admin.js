const express = require('express');
const router = express.Router();
const User = require('../model/user');
const Stay = require('../model/stay');
const Booking = require('../model/booking');
const Review = require('../model/review');
const checkAuth = require('../middleware/auth');
const isAdmin = require('../middleware/adminAuth');

// Protect all admin routes
router.use(checkAuth);
router.use(isAdmin);

// Dashboard Route
router.get('/dashboard', async (req, res, next) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStays = await Stay.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const totalReviews = await Review.countDocuments();

        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10);
        const recentStays = await Stay.find().populate('host').sort({ createdAt: -1 }).limit(5);
        const recentBookings = await Booking.find().populate('stay').populate('user').sort({ createdAt: -1 }).limit(5);

        res.render('admin/admin', {
            totalUsers,
            totalStays,
            totalBookings,
            totalReviews,
            recentUsers,
            recentStays,
            recentBookings
        });
    } catch (e) {
        next(e);
    }
});

// Toggle Block Status for User
router.post('/users/:id/toggle-block', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            res.cookie('flash', { type: 'danger', message: 'User not found.' });
            return res.redirect('/stayease-control-center/dashboard');
        }

        // Prevent admin from blocking themselves
        if (user._id.equals(res.locals.currentUser._id)) {
            res.cookie('flash', { type: 'danger', message: 'You cannot block yourself.' });
            return res.redirect('/stayease-control-center/dashboard');
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.cookie('flash', { 
            type: 'success', 
            message: `User ${user.username} has been ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.` 
        });
        res.redirect('/stayease-control-center/dashboard');
    } catch (e) {
        next(e);
    }
});

module.exports = router;
