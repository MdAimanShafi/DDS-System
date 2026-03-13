const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['panic', 'lockdown', 'unlock', 'force_logout', 'suspicious_login', 'verification_required'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  deviceInfo: {
    type: String
  },
  location: {
    country: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number
  },
  reason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

securityEventSchema.index({ userId: 1, timestamp: -1 });
securityEventSchema.index({ eventType: 1 });

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
