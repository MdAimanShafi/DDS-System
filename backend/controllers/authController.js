const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AttackLog = require('../models/AttackLog');
const SecurityEvent = require('../models/SecurityEvent');
const riskEngine = require('../utils/riskEngine');
const securityController = require('./securityController');
const axios = require('axios');

const getLocationFromIP = async (ip) => {
  try {
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
      return { 
        country: 'Local', 
        city: 'Localhost', 
        lat: 40.7128, 
        lon: -74.0060,
        region: 'Local Network'
      };
    }
    
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon,regionName`);
    
    if (response.data.status === 'success') {
      return {
        country: response.data.country || 'Unknown',
        city: response.data.city || 'Unknown',
        lat: response.data.lat || 0,
        lon: response.data.lon || 0,
        region: response.data.regionName || 'Unknown'
      };
    }
    
    return { country: 'Unknown', city: 'Unknown', lat: 0, lon: 0, region: 'Unknown' };
  } catch (error) {
    return { country: 'Unknown', city: 'Unknown', lat: 0, lon: 0, region: 'Unknown' };
  }
};

const logAttack = async (email, ip, device, attackType, riskLevel, io) => {
  try {
    const location = await getLocationFromIP(ip);
    
    const log = await AttackLog.create({
      email,
      ipAddress: ip,
      deviceInfo: device,
      attackType,
      riskLevel,
      location
    });
    
    if (io) {
      io.emit('securityAlert', {
        message: attackType,
        email,
        ip,
        location: `${location.city}, ${location.country}`,
        riskLevel,
        timestamp: new Date(),
        attackId: log._id
      });
      
      io.emit('newAttack', log);
    }
    
    return log;
  } catch (error) {
    console.error('Error logging attack:', error);
    return null;
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';
    
    const user = await User.create({ 
      name, 
      username: email.toLowerCase(),
      email: email.toLowerCase(), 
      password,
      knownIPs: [ip],
      knownDevices: [device],
      lastLoginIP: ip
    });
    
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Store initial session
    user.activeSessions.push({
      token,
      deviceInfo: device,
      ipAddress: ip,
      createdAt: new Date()
    });
    await user.save();
    
    res.status(201).json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email,
        riskScore: 0
      } 
    });
  } catch (error) {
    // Handle duplicates gracefully (e.g., race conditions creating the same user)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, verificationCode } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if IP is blocked
    if (securityController.isIPBlocked(ip)) {
      await logAttack(email, ip, device, 'Login attempt from BLOCKED IP', 'critical', req.app.get('io'));
      return res.status(403).json({ 
        error: 'This IP address has been temporarily blocked due to security concerns',
        blocked: true
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      await logAttack(email, ip, device, 'Failed login attempt - User not found', 'low', req.app.get('io'));
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if account requires verification after panic mode
    if (user.requiresVerification) {
      if (!verificationCode) {
        return res.status(403).json({ 
          error: 'Your account was secured due to suspicious activity. Verification required.',
          requiresVerification: true,
          panicMode: true,
          message: 'Please enter the verification code sent to your email'
        });
      }
      
      // Verify code
      if (user.verificationCode !== verificationCode.toUpperCase()) {
        return res.status(400).json({ 
          error: 'Invalid verification code',
          requiresVerification: true
        });
      }
      
      if (user.verificationExpires < new Date()) {
        return res.status(400).json({ 
          error: 'Verification code expired',
          requiresVerification: true,
          expired: true
        });
      }
    }

    // If user needs to change password, require them to do so before normal login
    if (user.requiresPasswordChange) {
      return res.status(403).json({
        error: 'Password change required',
        requiresPasswordChange: true,
        locked: true
      });
    }
    
    if (user.isLocked && !user.requiresVerification) {
      await logAttack(email, ip, device, 'Login attempt on LOCKED account', 'critical', req.app.get('io'));
      return res.status(403).json({ 
        error: 'Account locked due to suspicious activity',
        locked: true,
        riskScore: user.riskScore
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      await user.incrementLoginAttempts();
      
      const riskFactors = {
        loginAttempts: user.loginAttempts,
        isNewDevice: !user.knownDevices.includes(device),
        isNewIP: !user.knownIPs.includes(ip),
        rapidAttempts: user.loginAttempts > 3
      };
      
      const riskScore = riskEngine.calculateRiskScore(riskFactors);
      const riskLevel = riskEngine.getRiskLevel(riskScore);
      
      if (user.loginAttempts >= 5) {
        await logAttack(email, ip, device, 'BRUTE FORCE ATTACK DETECTED', 'critical', req.app.get('io'));
      } else if (user.loginAttempts >= 3) {
        await logAttack(email, ip, device, 'Multiple failed login attempts', 'high', req.app.get('io'));
      } else {
        await logAttack(email, ip, device, 'Failed login attempt', riskLevel, req.app.get('io'));
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        attempts: user.loginAttempts,
        remaining: Math.max(0, 5 - user.loginAttempts)
      });
    }
    
    const riskFactors = {
      loginAttempts: user.loginAttempts,
      isNewDevice: !user.knownDevices.includes(device),
      isNewIP: !user.knownIPs.includes(ip),
      rapidAttempts: false
    };
    
    const riskScore = riskEngine.calculateRiskScore(riskFactors);
    const riskLevel = riskEngine.getRiskLevel(riskScore);
    
    user.riskScore = riskScore;
    
    if (riskEngine.shouldLockAccount(riskScore)) {
      user.isLocked = true;
      await user.save();
      await logAttack(email, ip, device, 'HIGH RISK LOGIN - Account auto-locked', 'critical', req.app.get('io'));
      
      return res.status(403).json({ 
        error: 'Account locked due to high risk score',
        locked: true,
        riskScore
      });
    }
    
    if (!user.knownIPs.includes(ip)) {
      user.knownIPs.push(ip);
      await logAttack(email, ip, device, 'Login from NEW IP ADDRESS', 'medium', req.app.get('io'));
    }
    
    if (!user.knownDevices.includes(device)) {
      user.knownDevices.push(device);
      await logAttack(email, ip, device, 'Login from UNKNOWN DEVICE', 'medium', req.app.get('io'));
    }
    
    // Send real-time notification to all user's devices about new login
    const io = req.app.get('io');
    const location = await getLocationFromIP(ip);
    
    // Notify user about new login from different device/IP
    if (riskFactors.isNewDevice || riskFactors.isNewIP) {
      io.emit('newLoginAlert', {
        userId: user._id.toString(),
        email: user.email,
        message: `New login detected from ${riskFactors.isNewDevice ? 'unknown device' : 'new IP'}`,
        location: `${location.city}, ${location.country}`,
        ipAddress: ip,
        deviceInfo: device,
        riskLevel,
        timestamp: new Date()
      });
      
      await logAttack(email, ip, device, `Login from ${riskFactors.isNewDevice ? 'UNKNOWN DEVICE' : 'NEW IP ADDRESS'}`, riskLevel, io);
    }
    
    if (riskScore > 0 && riskScore <= 70) {
      await logAttack(email, ip, device, 'Suspicious login detected', riskLevel, io);
    }
    
    // Clear verification if it was required
    if (user.requiresVerification) {
      user.requiresVerification = false;
      user.verificationCode = undefined;
      user.verificationExpires = undefined;
      user.panicMode = false;
      
      // Log successful verification
      const location = await getLocationFromIP(ip);
      await SecurityEvent.create({
        userId: user._id,
        email: user.email,
        eventType: 'verification_required',
        ipAddress: ip,
        deviceInfo: device,
        location,
        reason: 'User successfully verified after panic mode'
      });
    }
    
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    
    // Generate new token
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Store active session
    user.activeSessions.push({
      token,
      deviceInfo: device,
      ipAddress: ip,
      createdAt: new Date()
    });
    
    // Keep only last 10 sessions
    if (user.activeSessions.length > 10) {
      user.activeSessions = user.activeSessions.slice(-10);
    }
    
    await user.save();
    
    res.json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        riskScore 
      },
      wasVerified: user.requiresVerification
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Password reset token generated',
      resetToken: resetToken // In production, send via email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Password reset successful' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Email, current password, and new password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.requiresPasswordChange = false;
    user.isLocked = false;
    user.requiresVerification = false;
    user.panicMode = false;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    user.loginAttempts = 0;
    user.activeSessions = [];

    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        riskScore: user.riskScore,
        isLocked: user.isLocked,
        lastLogin: user.lastLogin,
        knownDevices: user.knownDevices.length,
        knownIPs: user.knownIPs.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
