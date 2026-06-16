const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    body: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    stay: {
        type: Schema.Types.ObjectId,
        ref: 'Stay',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
