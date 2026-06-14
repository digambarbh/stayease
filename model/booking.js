


const mongoose = require('mongoose')
const Schema = mongoose.Schema;


const bookingSchema = new Schema({
  checkIn:    { type: Date, required: true },
  checkOut:   { type: Date, required: true },
  guests:     { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  nights: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 
           'rejected', 'cancelled'],
    default: 'pending'
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String }
  },

  // Relations
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',        // who booked
    required: true
  },
  stay: {
    type: Schema.Types.ObjectId,
    ref: 'Stay',        // what was booked
    required: true
  },
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',        // who owns the stay
    required: true
  }

}, { timestamps: true });


module.exports=mongoose.model("Booking",bookingSchema)