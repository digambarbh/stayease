const express = require('express');
const router = express.Router({ mergeParams: true });
const Stay = require('../model/stay');
const Review = require('../model/review');
const checkAuth = require('../middleware/auth');
const { hasBookedStay, isReviewAuthor } = require('../middleware/reviewAuth');
const { validateReview } = require('../middleware/validate');
const catchAsync = require('../utility/catchAsync');

const sanitizeReviewBody = (body) => {
    if (typeof body !== 'string') return '';
    const sanitized = body.replace(/<[^>]*>/g, '').trim();
    return sanitized;
};

const reviewRedirect = (id, res, message) => {
    res.cookie('flash', { type: 'danger', message });
    return res.redirect(`/stays/${id}`);
};

// Create Review
router.post('/', checkAuth, hasBookedStay, validateReview, catchAsync(async (req, res) => {
    const { id } = req.params;
    const stay = await Stay.findById(id);
    if (!stay) return reviewRedirect(id, res, 'Stay not found.');

    const reviewData = req.body.review || {};
    const sanitizedBody = sanitizeReviewBody(reviewData.body);
    if (!sanitizedBody) {
        return reviewRedirect(id, res, 'Review text cannot be empty.');
    }

    const review = new Review({
        rating: Number(reviewData.rating),
        body: sanitizedBody,
        author: req.user,
        stay: stay._id
    });

    await review.save();
    stay.reviews.push(review._id);
    await stay.save();

    res.cookie('flash', { type: 'success', message: 'Review added successfully!' });
    res.redirect(`/stays/${stay._id}`);
}));

// Update Review
router.put('/:reviewId', checkAuth, isReviewAuthor, validateReview, catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    const reviewData = req.body.review || {};
    const sanitizedBody = sanitizeReviewBody(reviewData.body);
    if (!sanitizedBody) {
        return reviewRedirect(id, res, 'Review text cannot be empty.');
    }

    const update = {
        rating: Number(reviewData.rating),
        body: sanitizedBody
    };
    await Review.findByIdAndUpdate(reviewId, update, { runValidators: true });
    res.cookie('flash', { type: 'success', message: 'Review updated successfully!' });
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
