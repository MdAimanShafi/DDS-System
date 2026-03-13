const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  isLocked: { 
    type: Boolean, 
    default: false 
  },
  loginAttempts: { 
    type: Number, 
    default: 0 
  },
  lastLogin: { 
    type: Date 
  },
  lastLoginIP: {
    type: String
  },
  knownIPs: {
    type: [String],
    default: []
  },
  knownDevices: {
    type: [String],
    default: []
  },
  riskScore: { 
    type: Number, 
    default: 0 
  },
  panicActivatedAt: {
    type: Date
  },
  panicMode: {
    type: Boolean,
    default: false
  },
  requiresVerification: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String
  },
  verificationExpires: {
    type: Date
  },
  blockedIPs: {
    type: [String],
    default: []
  },
  activeSessions: {
    type: [{
      token: String,
      deviceInfo: String,
      ipAddress: String,
      createdAt: { type: Date, default: Date.now }
    }],
    default: []
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

userSchema.pre('validate', function(next) {
  // Ensure username is always set for uniqueness enforcement
  if (!this.username) {
    this.username = this.email ? this.email.toLowerCase() : undefined;
  }
  next();
});

userSchema.pre('save', async function(next) {
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
