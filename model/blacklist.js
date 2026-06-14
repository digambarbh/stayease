// Then you need blacklist




const mongoose = require('mongoose')
const Schema = mongoose.Schema;


const blacklistSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// TTL index — auto delete after 7 days
blacklistSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 604800 }
);

module.exports=mongoose.model(
  'BlacklistedToken',
  blacklistSchema
);