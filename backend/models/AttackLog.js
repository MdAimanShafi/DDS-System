const mongoose = require('mongoose');

const attackLogSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    index: true
  },
  ipAddress: { 
    type: String, 
    required: true 
  },
  deviceInfo: { 
    type: String 
  },
  attackType: { 
    type: String, 
    required: true 
  },
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  location: {
    country: String,
    countryCode: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number,
    timezone: String,
    isp: String,
    org: String,
    zip: String
  },
  blocked: {
    type: Boolean,
    default: false
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

attackLogSchema.index({ email: 1, timestamp: -1 });
attackLogSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('AttackLog', attackLogSchema);
