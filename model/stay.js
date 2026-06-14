

const mongoose = require('mongoose')
const Schema = mongoose.Schema;


const staySchema = new Schema({
  name:        { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  price:       { type: Number, required: true },
  capacity:    { type: Number, required: true },
  geometry: {
        lat: Number,
        lng: Number
    },
  images:      [{
    url: { type: String },
    filename: { type: String }
  }],
  type: {
    type: String,
    enum: ['apartment', 'villa', 
           'cabin', 'cottage', 'hotel']
  },
  isAvailable: { type: Boolean, default: true },

  // Relations
  host: {
    type: Schema.Types.ObjectId,
    ref: 'User',        // points to User
    // required: true
  },
  bookings: [{ type: Schema.Types.ObjectId, ref: 'Booking' }],
  // Error: Review model does not exist yet.
  // reviews:  [{ type: Schema.Types.ObjectId, ref: 'Review' }]

}, { timestamps: true });

module.exports=mongoose.model("Stay",staySchema)
