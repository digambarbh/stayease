const express = require('express');
const router = express.Router({ mergeParams: true });
const Stay = require('../model/stay');
const Review = require('../model/review');
const checkAuth = require('../middleware/auth');
const { hasBookedStay, isReviewAuthor } = require('../middleware/reviewAuth');
const { validateReview } = require('../middleware/validate');
const catchAsync = require('../utility/catchAsync');

// Create Review
router.post('/', checkAuth, hasBookedStay, validateReview, catchAsync(async (req, res) => {
    const stay = await Stay.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user;
    review.stay = stay._id;
    stay.reviews.push(review);
    
    await review.save();
    await stay.save();
    
    res.cookie("flash", { type: "success", message: "Review added successfully!" });
    res.redirect(`/stays/${stay._id}`);
}));

// Update Review
router.put('/:reviewId', checkAuth, isReviewAuthor, validateReview, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Review.findByIdAndUpdate(reviewId, { ...req.body.review });
    res.cookie("flash", { type: "success", message: "Review updated successfully!" });
    res.redirect(`/stays/${id}`);
}));

// Delete Review
router.delete('/:reviewId', checkAuth, isReviewAuthor, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Stay.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.cookie("flash", { type: "success", message: "Review deleted successfully!" });
    res.redirect(`/stays/${id}`);
}));

module.exports = router;
