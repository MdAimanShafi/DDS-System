const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AttackLog = require('../models/AttackLog');
const SecurityEvent = require('../models/SecurityEvent');
const riskEngine = require('../utils/riskEngine');
const securityController = require('./securityController');
const { checkGeoFence } = require('./geoFenceController');
const axios = require('axios');

const getLocationFromIP = async (ip) => {
  try {
    // Handle localhost IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1')) {
      // Get real public IP for localhost
      try {
        const publicIPResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 3000 });
        const publicIP = publicIPResponse.data.ip;
        console.log(`🌐 Localhost detected, using public IP: ${publicIP}`);
        ip = publicIP;
      } catch (error) {
        console.log('⚠️ Could not fetch public IP, using default location');
        return { 
          country: 'India', 
          city: 'Mumbai', 
          lat: 19.0760, 
          lon: 72.8777,
          region: 'Maharashtra',
          timezone: 'Asia/Kolkata',
          isp: 'Local Network'
        };
      }
    }
    
    // Use ip-api.com for geolocation (free, no API key needed)
    console.log(`📍 Fetching location for IP: ${ip}`);
    const response = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { timeout: 5000 }
    );
    
    if (response.data.status === 'success') {
      const location = {
        country: response.data.country || 'Unknown',
        countryCode: response.data.countryCode || 'XX',
        city: response.data.city || 'Unknown',
        region: response.data.regionName || 'Unknown',
        lat: response.data.lat || 0,
        lon: response.data.lon || 0,
        timezone: response.data.timezone || 'UTC',
        isp: response.data.isp || 'Unknown ISP',
        org: response.data.org || 'Unknown',
        zip: response.data.zip || 'N/A'
      };
      console.log(`✅ Location found: ${location.city}, ${location.country}`);
      return location;
    } else {
      console.log(`⚠️ IP-API returned: ${response.data.message}`);
      throw new Error(response.data.message || 'Location lookup failed');
    }
  } catch (error) {
    console.error('❌ Error fetching location:', error.message);
    // Return default location on error
    return { 
      country: 'Unknown', 
      countryCode: 'XX',
      city: 'Unknown', 
      region: 'Unknown',
      lat: 0, 
      lon: 0,
      timezone: 'UTC',
      isp: 'Unknown',
      org: 'Unknown',
      zip: 'N/A'
    };
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
    const location = await getLocationFromIP(ip);
    
    const user = await User.create({ 
      name, 
      username: email.toLowerCase(),
      email: email.toLowerCase(), 
      password,
      knownIPs: [ip],
      knownDevices: [device],
      lastLoginIP: ip,
      lastLoginLocation: location
    });
    
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1m' }
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
    const io = req.app.get('io');
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if IP is blocked
    if (securityController.isIPBlocked(ip)) {
      await logAttack(email, ip, device, '🚫 Login attempt from BLOCKED IP', 'critical', io);
      return res.status(403).json({ 
        error: 'This IP address has been temporarily blocked due to security concerns',
        blocked: true
      });
    }
    
    // Track rapid login attempts
    const isRapid = riskEngine.isRapidAttempt(ip + email);
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      await logAttack(email, ip, device, '❌ Failed login - User not found', 'low', io);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Auto-unlock if lock period expired
    if (user.isLocked && user.lockUntil && user.lockUntil < new Date()) {
      console.log(`🔓 Auto-unlocking account for ${user.email} - lock period expired`);
      user.isLocked = false;
      user.lockUntil = undefined;
      user.panicMode = false;
      user.riskScore = 0;
      user.loginAttempts = 0;
      user.requiresVerification = false;
      user.requiresPasswordChange = false;
      await user.save();
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

    if (user.requiresPasswordChange) {
      return res.status(403).json({
        error: 'Password change required',
        requiresPasswordChange: true,
        locked: true
      });
    }
    
    if (user.isLocked && !user.requiresVerification) {
      await logAttack(email, ip, device, '🔒 Login attempt on LOCKED account', 'critical', io);
      return res.status(403).json({ 
        error: 'Account locked due to suspicious activity',
        locked: true,
        riskScore: user.riskScore
      });
    }
    
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      await user.incrementLoginAttempts();
      
      const currentLocation = await getLocationFromIP(ip);
      const impossibleTravel = riskEngine.detectImpossibleTravel(
        user.lastLoginLocation, 
        currentLocation, 
        user.lastLogin
      );
      
      const riskFactors = {
        loginAttempts: user.loginAttempts,
        isNewDevice: !user.knownDevices.includes(device),
        isNewIP: !user.knownIPs.includes(ip),
        rapidAttempts: isRapid,
        impossibleTravel,
        suspiciousLocation: false
      };
      
      const riskResult = riskEngine.calculateRiskScore(riskFactors);
      const riskScore = typeof riskResult === 'object' ? riskResult.score : riskResult;
      const riskLevel = riskEngine.getRiskLevel(riskScore);
      
      if (user.loginAttempts >= 5) {
        await logAttack(email, ip, device, '🚨 BRUTE FORCE ATTACK DETECTED', 'critical', io);
        
        securityController.blockIP(ip, 'Brute force attack', 1);
        
        io.emit('securityAlert', {
          message: '🚨 Brute force attack blocked',
          email,
          ip,
          riskLevel: 'critical',
          timestamp: new Date()
        });
      } else if (user.loginAttempts >= 3) {
        await logAttack(email, ip, device, '⚠️ Multiple failed login attempts', 'high', io);
      } else {
        await logAttack(email, ip, device, '❌ Failed login attempt', riskLevel, io);
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        attempts: user.loginAttempts,
        remaining: Math.max(0, 5 - user.loginAttempts)
      });
    }
    
    // Successful password match - check risk
    const successLocation = await getLocationFromIP(ip);

    // ── GEO-FENCE CHECK ──────────────────────────────────────────────────
    if (user.geoFencingEnabled && user.trustedLocations.length > 0 && successLocation.lat) {
      const geoResult = checkGeoFence(user, successLocation.lat, successLocation.lon);
      if (geoResult.blocked) {
        await logAttack(email, ip, device, '🌍 GEO-FENCE BLOCKED: Login from untrusted location', 'critical', io);
        return res.status(403).json({
          error: 'Login blocked by Geo-Fencing: You are outside all trusted locations.',
          geoBlocked: true,
          currentLocation: `${successLocation.city}, ${successLocation.country}`
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────────
    const impossibleTravelSuccess = riskEngine.detectImpossibleTravel(
      user.lastLoginLocation, 
      successLocation, 
      user.lastLogin
    );
    
    const successRiskFactors = {
      loginAttempts: user.loginAttempts,
      isNewDevice: !user.knownDevices.includes(device),
      isNewIP: !user.knownIPs.includes(ip),
      rapidAttempts: isRapid,
      impossibleTravel: impossibleTravelSuccess,
      suspiciousLocation: false
    };
    
    const successRiskResult = riskEngine.calculateRiskScore(successRiskFactors);
    const riskScore = typeof successRiskResult === 'object' ? successRiskResult.score : successRiskResult;
    const riskLevel = riskEngine.getRiskLevel(riskScore);
    const riskReasons = typeof successRiskResult === 'object' ? successRiskResult.reasons : [];
    
    user.riskScore = riskScore;
    
    if (riskEngine.shouldLockAccount(riskScore)) {
      user.isLocked = true;
      await user.save();
      await logAttack(email, ip, device, '🔒 HIGH RISK LOGIN - Account auto-locked', 'critical', io);
      
      io.emit('accountLocked', {
        userId: user._id.toString(),
        email: user.email,
        riskScore,
        reasons: riskReasons,
        timestamp: new Date()
      });
      
      return res.status(403).json({ 
        error: 'Account locked due to high risk score',
        locked: true,
        riskScore,
        reasons: riskReasons
      });
    }
    
    const isNewIP = !user.knownIPs.includes(ip);
    const isNewDevice = !user.knownDevices.includes(device);
    
    if (isNewIP) {
      user.knownIPs.push(ip);
      await logAttack(email, ip, device, '🌐 Login from NEW IP ADDRESS', 'medium', io);
    }
    
    if (isNewDevice) {
      user.knownDevices.push(device);
      await logAttack(email, ip, device, '💻 Login from UNKNOWN DEVICE', 'medium', io);
    }
    
    // Notify user about new login from different device/IP
    if (isNewDevice || isNewIP || impossibleTravelSuccess) {
      let alertMessage = '🔔 New login detected';
      if (impossibleTravelSuccess) {
        alertMessage = '⚠️ IMPOSSIBLE TRAVEL DETECTED - Login from different location';
      } else if (isNewDevice && isNewIP) {
        alertMessage = '🚨 Login from UNKNOWN DEVICE and NEW IP';
      } else if (isNewDevice) {
        alertMessage = '💻 Login from UNKNOWN DEVICE';
      } else if (isNewIP) {
        alertMessage = '🌐 Login from NEW IP ADDRESS';
      }
      
      io.emit('newLoginAlert', {
        userId: user._id.toString(),
        email: user.email,
        message: alertMessage,
        location: `${successLocation.city}, ${successLocation.country}`,
        ipAddress: ip,
        deviceInfo: device,
        riskLevel,
        riskScore,
        reasons: riskReasons,
        timestamp: new Date()
      });
    }
    
    if (riskScore > 0 && riskScore <= 70) {
      await logAttack(email, ip, device, '⚠️ Suspicious login detected', riskLevel, io);
    }
    
    // Clear verification if it was required
    if (user.requiresVerification) {
      user.requiresVerification = false;
      user.verificationCode = undefined;
      user.verificationExpires = undefined;
      user.panicMode = false;
      
      await SecurityEvent.create({
        userId: user._id,
        email: user.email,
        eventType: 'verification_required',
        ipAddress: ip,
        deviceInfo: device,
        location: successLocation,
        reason: 'User successfully verified after panic mode'
      });
    }
    
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    user.lastLoginLocation = successLocation;
    
    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1m' }
    );
    
    user.activeSessions.push({
      token,
      deviceInfo: device,
      ipAddress: ip,
      createdAt: new Date()
    });
    
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
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    
    res.json({ 
      success: true,
      message: 'Password reset token generated',
      resetToken: resetToken
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
