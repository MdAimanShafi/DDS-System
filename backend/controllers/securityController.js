const User = require('../models/User');
const AttackLog = require('../models/AttackLog');
const SecurityEvent = require('../models/SecurityEvent');
const riskEngine = require('../utils/riskEngine');
const axios = require('axios');
const crypto = require('crypto');

// Global security state management
const invalidatedTokens = new Set();
const blockedIPs = new Map(); // IP -> { blockedUntil, reason }
const activeUserSessions = new Map(); // userId -> Set of socketIds

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
      location,
      blocked: blockedIPs.has(ip)
    });
    
    if (io) {
      io.emit('securityAlert', {
        message: `${attackType}`,
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

exports.panic = async (req, res) => {
  try {
    const user = req.user;
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';
    const io = req.app.get('io');
    
    console.log(`🚨 PANIC MODE ACTIVATED for user: ${user.email}`);
    
    // 1. Invalidate ALL user tokens
    if (user.activeSessions && user.activeSessions.length > 0) {
      user.activeSessions.forEach(session => {
        invalidatedTokens.add(session.token);
      });
    }
    
    // Add current token to invalidated list
    const currentToken = req.headers.authorization?.split(' ')[1];
    if (currentToken) {
      invalidatedTokens.add(currentToken);
    }
    
    // 2. Block suspicious IPs temporarily (24 hours)
    const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    blockedIPs.set(ip, {
      blockedUntil: blockUntil,
      reason: 'Panic mode activated',
      userId: user._id
    });
    
    // Add to user's blocked IPs list
    if (!user.blockedIPs.includes(ip)) {
      user.blockedIPs.push(ip);
    }
    
    // 3. Update user security state
    // Lock the account and require a password change to re-enable
    user.isLocked = true;
    user.panicMode = true;
    user.requiresVerification = true;
    user.requiresPasswordChange = true;
    user.knownIPs = [];
    user.knownDevices = [];
    user.riskScore = 100;
    user.panicActivatedAt = new Date();
    user.activeSessions = []; // Clear all sessions
    
    // Generate verification code for re-login
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    await user.save();
    
    // 4. Log security event
    const location = await getLocationFromIP(ip);
    await SecurityEvent.create({
      userId: user._id,
      email: user.email,
      eventType: 'panic',
      ipAddress: ip,
      deviceInfo: device,
      location,
      reason: 'User activated panic button',
      metadata: {
        sessionsTerminated: user.activeSessions.length || 0,
        tokensInvalidated: invalidatedTokens.size,
        verificationCode
      }
    });
    
    // 5. Log attack
    await logAttack(user.email, ip, device, '🚨 PANIC BUTTON ACTIVATED - SECURITY LOCKDOWN', 'critical', io);
    
    // 6. Emit global force logout event to ALL user's sessions
    io.emit('force_logout', {
      userId: user._id.toString(),
      email: user.email,
      message: 'Security lockdown activated. All sessions terminated.',
      reason: 'panic_mode',
      timestamp: new Date()
    });
    
    // 7. Emit panic activated event
    io.emit('panicActivated', {
      message: '🚨 SECURITY LOCKDOWN ACTIVATED',
      email: user.email,
      timestamp: new Date(),
      action: 'All sessions terminated'
    });
    
    console.log(`✅ Panic mode completed for ${user.email}`);
    console.log(`   - Sessions terminated: ${user.activeSessions.length || 0}`);
    console.log(`   - Verification code: ${verificationCode}`);
    console.log(`   - IP blocked: ${ip}`);
    
    res.json({ 
      success: true,
      message: 'Security lockdown activated',
      verificationCode, // In production, send via email/SMS
      actions: [
        'Account locked',
        'All sessions terminated globally',
        'All tokens invalidated',
        'Suspicious IP blocked for 24 hours',
        'Trusted devices cleared',
        'Verification required for re-login'
      ],
      status: 'LOCKDOWN_ACTIVE'
    });
  } catch (error) {
    console.error('Panic mode error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAttackLogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await AttackLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json({ success: true, logs, total: logs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserAttackLogs = async (req, res) => {
  try {
    const user = req.user;
    const logs = await AttackLog.find({ email: user.email })
      .sort({ timestamp: -1 })
      .limit(100);
    
    res.json({ success: true, logs, total: logs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const logs = await AttackLog.find({ email: user.email })
      .sort({ timestamp: -1 })
      .limit(50);
    
    const totalAttacks = await AttackLog.countDocuments({ email: user.email });
    const criticalAttacks = await AttackLog.countDocuments({ 
      email: user.email, 
      riskLevel: 'critical' 
    });
    const highRiskAttacks = await AttackLog.countDocuments({ 
      email: user.email, 
      riskLevel: 'high' 
    });
    
    const recentLogins = logs.filter(log => 
      log.attackType.includes('Login') || log.attackType.includes('login')
    ).slice(0, 10);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        riskScore: user.riskScore,
        isLocked: user.isLocked,
        loginAttempts: user.loginAttempts,
        lastLogin: user.lastLogin,
        knownIPs: user.knownIPs.length,
        knownDevices: user.knownDevices.length
      },
      stats: {
        totalAttacks,
        criticalAttacks,
        highRiskAttacks,
        recentLogins: recentLogins.length
      },
      attackLogs: logs,
      recentActivity: recentLogins
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unlockAccount = async (req, res) => {
  try {
    const user = req.user;
    
    user.isLocked = false;
    user.loginAttempts = 0;
    user.riskScore = 0;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Account unlocked successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSecurityStatus = async (req, res) => {
  try {
    const user = req.user;
    
    const recentAttacks = await AttackLog.countDocuments({
      email: user.email,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const status = {
      accountStatus: user.isLocked ? 'LOCKED' : 'ACTIVE',
      riskLevel: riskEngine.getRiskLevel(user.riskScore),
      riskScore: user.riskScore,
      recentAttacks24h: recentAttacks,
      trustedDevices: user.knownDevices.length,
      trustedIPs: user.knownIPs.length,
      lastLogin: user.lastLogin,
      recommendation: riskEngine.getRecommendedAction(user.riskScore)
    };
    
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verification endpoint for re-login after panic
exports.verifyReLogin = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    
    if (!email || !verificationCode) {
      return res.status(400).json({ error: 'Email and verification code required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if verification is required
    if (!user.requiresVerification) {
      return res.json({ 
        success: true, 
        verified: true,
        message: 'No verification required' 
      });
    }
    
    // Check verification code
    if (user.verificationCode !== verificationCode.toUpperCase()) {
      return res.status(400).json({ 
        error: 'Invalid verification code',
        verified: false 
      });
    }
    
    // Check if code expired
    if (user.verificationExpires < new Date()) {
      return res.status(400).json({ 
        error: 'Verification code expired. Please request a new one.',
        expired: true 
      });
    }
    
    // Clear verification requirement
    user.requiresVerification = false;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    // Log security event
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';
    const location = await getLocationFromIP(ip);
    
    await SecurityEvent.create({
      userId: user._id,
      email: user.email,
      eventType: 'verification_required',
      ipAddress: ip,
      deviceInfo: device,
      location,
      reason: 'User verified identity after panic mode'
    });
    
    res.json({ 
      success: true, 
      verified: true,
      message: 'Verification successful' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Unlock account endpoint
exports.unlockAccount = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user is in panic mode
    if (user.panicMode) {
      return res.status(403).json({ 
        error: 'Account is in panic mode. Please verify your identity first.',
        requiresVerification: true
      });
    }
    
    user.isLocked = false;
    user.loginAttempts = 0;
    user.riskScore = 0;
    user.panicMode = false;
    await user.save();
    
    // Log security event
    const ip = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';
    const location = await getLocationFromIP(ip);
    
    await SecurityEvent.create({
      userId: user._id,
      email: user.email,
      eventType: 'unlock',
      ipAddress: ip,
      deviceInfo: device,
      location,
      reason: 'User manually unlocked account'
    });
    
    res.json({ 
      success: true, 
      message: 'Account unlocked successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get security events
exports.getSecurityEvents = async (req, res) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 50;
    
    const events = await SecurityEvent.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json({ success: true, events, total: events.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.requiresVerification) {
      return res.status(400).json({ error: 'No verification required' });
    }
    
    // Generate new verification code
    const verificationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    user.verificationCode = verificationCode;
    user.verificationExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    
    console.log(`📧 New verification code for ${email}: ${verificationCode}`);
    
    res.json({ 
      success: true, 
      message: 'Verification code sent',
      verificationCode // In production, send via email/SMS
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Check if IP is blocked
exports.checkIPBlocked = (ip) => {
  const blocked = blockedIPs.get(ip);
  if (!blocked) return false;
  
  // Check if block expired
  if (blocked.blockedUntil < new Date()) {
    blockedIPs.delete(ip);
    return false;
  }
  
  return true;
};

// Utility exports
exports.isTokenInvalidated = (token) => invalidatedTokens.has(token);
exports.isIPBlocked = (ip) => {
  const blocked = blockedIPs.get(ip);
  if (!blocked) return false;
  return blocked.blockedUntil > new Date();
};
exports.blockIP = (ip, reason = 'Security violation', duration = 24) => {
  const blockUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
  blockedIPs.set(ip, {
    blockedUntil: blockUntil,
    reason
  });
};
exports.getActiveUserSessions = (userId) => activeUserSessions.get(userId) || new Set();
exports.addUserSession = (userId, socketId) => {
  if (!activeUserSessions.has(userId)) {
    activeUserSessions.set(userId, new Set());
  }
  activeUserSessions.get(userId).add(socketId);
};
exports.removeUserSession = (userId, socketId) => {
  const sessions = activeUserSessions.get(userId);
  if (sessions) {
    sessions.delete(socketId);
    if (sessions.size === 0) {
      activeUserSessions.delete(userId);
    }
  }
};
