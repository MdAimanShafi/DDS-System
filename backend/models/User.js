const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isLocked: { type: Boolean, default: false },
  lockUntil: { type: Date },
  requiresPasswordChange: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lastLogin: { type: Date },
  lastLoginIP: { type: String },
  lastLoginLocation: {
    country: String, countryCode: String, city: String, region: String,
    lat: Number, lon: Number, timezone: String, isp: String, org: String, zip: String
  },
  knownIPs: { type: [String], default: [] },
  knownDevices: { type: [String], default: [] },
  riskScore: { type: Number, default: 0 },
  panicActivatedAt: { type: Date },
  panicMode: { type: Boolean, default: false },
  requiresVerification: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationExpires: { type: Date },
  blockedIPs: { type: [String], default: [] },
  activeSessions: {
    type: [{ token: String, deviceInfo: String, ipAddress: String, createdAt: { type: Date, default: Date.now } }],
    default: []
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // ── GEO-FENCING ──
  trustedLocations: {
    type: [{
      name: { type: String, required: true },       // e.g. "Home", "Office"
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
      radiusKm: { type: Number, default: 50 },       // allowed radius in km
      addedAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  geoFencingEnabled: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('validate', function(next) {
  // Ensure username is always set for uniqueness enforcement
  if (!this.username) {
    this.username = this.email ? this.email.toLowerCase() : undefined;
  }
  next();
});

userSchema.pre('save', async function(next) {
  // Ensure riskScore is always a number
  if (this.riskScore && typeof this.riskScore === 'object') {
    this.riskScore = this.riskScore.score || 0;
  }
  if (typeof this.riskScore !== 'number') {
    this.riskScore = 0;
  }
  
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  return this.save();
};

userSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
