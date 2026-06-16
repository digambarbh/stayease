const Booking = require('../model/booking');
const Review = require('../model/review');
const Stay = require('../model/stay');

module.exports.hasBookedStay = async (req, res, next) => {
    try {
        const { id } = req.params; // the stay ID
        const userId = req.user;

        // Check if the user has an approved or completed booking for this stay
        const booking = await Booking.findOne({
            user: userId,
            stay: id,
            status: { $in: ['approved'] } // or whatever status indicates a valid booking
        });

        if (!booking) {
            res.cookie("flash", { type: "danger", message: "You can only review a stay after booking it." });
            return res.redirect(`/stays/${id}`);
        }
        
        next();
    } catch (e) {
        next(e);
    }
};

module.exports.isReviewAuthor = async (req, res, next) => {
    try {
        const { id, reviewId } = req.params;
        const review = await Review.findById(reviewId);
        
        if (!review) {
            res.cookie("flash", { type: "danger", message: "Review not found." });
            return res.redirect(`/stays/${id}`);
        }

        if (!review.author.equals(req.user)) {
            res.cookie("flash", { type: "danger", message: "You do not have permission to do that." });
            return res.redirect(`/stays/${id}`);
        }
        
        next();
    } catch (e) {
        next(e);
    }
};
