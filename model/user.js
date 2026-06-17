const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone:    { type: String, required: true },
  avatar:   { type: String, default: null },
  role: {
    type: String,
    enum: ['user', 'host', 'admin'],
    default: 'user'
  },
  isBlocked: {
    type: Boolean,
    default: false
  },

  // Relations
  wishlist: [{ type: Schema.Types.ObjectId, ref: 'Stay' }],
  stay: [{ type: Schema.Types.ObjectId, ref: 'Stay' }],
  bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }]

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema)