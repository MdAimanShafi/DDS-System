const User = require('../models/User');
const AttackLog = require('../models/AttackLog');
const SecurityEvent = require('../models/SecurityEvent');

// ─── Haversine distance (km) ───────────────────────────────────────────────
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Check if location is inside any trusted zone ─────────────────────────
function isInsideTrustedZone(trustedLocations, lat, lon) {
  for (const loc of trustedLocations) {
    const dist = distanceKm(loc.lat, loc.lon, lat, lon);
    if (dist <= loc.radiusKm) return { allowed: true, zone: loc.name, dist: Math.round(dist) };
  }
  return { allowed: false };
}

// ─── Password Strength Checker ────────────────────────────────────────────
function checkPasswordStrength(password) {
  const issues = [];
  let score = 0;

  if (password.length >= 12) score += 2; else if (password.length >= 8) score += 1; else issues.push('Too short (min 8 chars)');
  if (/[A-Z]/.test(password)) score += 1; else issues.push('Add uppercase letters');
  if (/[a-z]/.test(password)) score += 1; else issues.push('Add lowercase letters');
  if (/[0-9]/.test(password)) score += 1; else issues.push('Add numbers');
  if (/[^A-Za-z0-9]/.test(password)) score += 2; else issues.push('Add special characters (!@#$...)');

  const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty', 'abc123', 'letmein', 'welcome', 'monkey', 'dragon'];
  if (commonPasswords.some(p => password.toLowerCase().includes(p))) {
    score = Math.max(0, score - 3);
    issues.push('Contains common password pattern - easily hackable!');
  }

  const strength = score >= 6 ? 'strong' : score >= 4 ? 'medium' : score >= 2 ? 'weak' : 'very_weak';
  const suggestions = {
    very_weak: 'Your password is very weak and can be hacked in seconds!',
    weak: 'Weak password - use mix of letters, numbers & symbols',
    medium: 'Decent password but can be improved',
    strong: 'Strong password!'
  };

  return { score, strength, issues, message: suggestions[strength], safe: score >= 5 };
}

// ─── GET trusted locations ────────────────────────────────────────────────
exports.getTrustedLocations = async (req, res) => {
  try {
    const user = req.user;
    res.json({ success: true, locations: user.trustedLocations, geoFencingEnabled: user.geoFencingEnabled });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── ADD trusted location ─────────────────────────────────────────────────
exports.addTrustedLocation = async (req, res) => {
  try {
    const { name, lat, lon, radiusKm } = req.body;
    if (!name || lat == null || lon == null) return res.status(400).json({ error: 'name, lat, lon required' });

    const user = req.user;
    if (user.trustedLocations.length >= 10) return res.status(400).json({ error: 'Max 10 trusted locations allowed' });

    user.trustedLocations.push({ name, lat: parseFloat(lat), lon: parseFloat(lon), radiusKm: parseInt(radiusKm) || 50 });
    await user.save();
    res.json({ success: true, locations: user.trustedLocations });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── DELETE trusted location ──────────────────────────────────────────────
exports.deleteTrustedLocation = async (req, res) => {
  try {
    const user = req.user;
    user.trustedLocations = user.trustedLocations.filter(l => l._id.toString() !== req.params.id);
    await user.save();
    res.json({ success: true, locations: user.trustedLocations });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── TOGGLE geo-fencing ───────────────────────────────────────────────────
exports.toggleGeoFencing = async (req, res) => {
  try {
    const user = req.user;
    user.geoFencingEnabled = !user.geoFencingEnabled;
    await user.save();
    res.json({ success: true, geoFencingEnabled: user.geoFencingEnabled });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── CHECK login location (called from authController) ───────────────────
exports.checkGeoFence = function (user, lat, lon) {
  if (!user.geoFencingEnabled || !user.trustedLocations.length) return { blocked: false };
  const result = isInsideTrustedZone(user.trustedLocations, lat, lon);
  if (result.allowed) return { blocked: false, zone: result.zone };
  return { blocked: true, message: `Login blocked: outside all trusted zones (nearest zone is far away)` };
};

// ─── PASSWORD STRENGTH CHECK API ─────────────────────────────────────────
exports.checkPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    res.json({ success: true, ...checkPasswordStrength(password) });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ─── WEEKLY REPORT GENERATOR ──────────────────────────────────────────────
exports.getWeeklyReport = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [attacks, events] = await Promise.all([
      AttackLog.find({ email: user.email, timestamp: { $gte: weekAgo } }).sort({ timestamp: -1 }),
      SecurityEvent.find({ userId: user._id, createdAt: { $gte: weekAgo } }).sort({ createdAt: -1 })
    ]);

    // Group attacks by type
    const byType = {};
    attacks.forEach(a => { byType[a.attackType] = (byType[a.attackType] || 0) + 1; });

    // Group by day
    const byDay = {};
    attacks.forEach(a => {
      const day = new Date(a.timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Unique IPs & locations
    const uniqueIPs = [...new Set(attacks.map(a => a.ipAddress))];
    const uniqueLocations = [...new Set(attacks.map(a => a.location ? `${a.location.city}, ${a.location.country}` : 'Unknown'))];

    const criticalCount = attacks.filter(a => a.riskLevel === 'critical').length;
    const highCount = attacks.filter(a => a.riskLevel === 'high').length;
    const panicEvents = events.filter(e => e.eventType === 'panic').length;

    // Password strength check
    const pwStrength = checkPasswordStrength(user.password || '');

    const report = {
      generatedAt: now,
      period: { from: weekAgo, to: now },
      user: { name: user.name, email: user.email },
      summary: {
        totalAttacks: attacks.length,
        criticalAttacks: criticalCount,
        highAttacks: highCount,
        panicActivations: panicEvents,
        uniqueAttackerIPs: uniqueIPs.length,
        uniqueLocations: uniqueLocations.length,
        currentRiskScore: user.riskScore,
        accountLocked: user.isLocked
      },
      attacksByType: byType,
      attacksByDay: byDay,
      topAttackerIPs: uniqueIPs.slice(0, 5),
      attackLocations: uniqueLocations.slice(0, 10),
      recentAttacks: attacks.slice(0, 20),
      securityEvents: events.slice(0, 10),
      recommendations: generateRecommendations(attacks, user, criticalCount)
    };

    res.json({ success: true, report });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

function generateRecommendations(attacks, user, criticalCount) {
  const recs = [];
  if (criticalCount > 0) recs.push({ level: 'critical', text: `${criticalCount} critical attacks detected this week. Review immediately.` });
  if (user.riskScore > 60) recs.push({ level: 'high', text: 'Your risk score is high. Consider changing password.' });
  if (!user.geoFencingEnabled) recs.push({ level: 'medium', text: 'Enable Geo-Fencing to block logins from unknown locations.' });
  if (user.trustedLocations?.length === 0) recs.push({ level: 'medium', text: 'Add trusted locations for better security.' });
  if (attacks.length > 10) recs.push({ level: 'high', text: 'High attack volume this week. Enable stricter security.' });
  if (recs.length === 0) recs.push({ level: 'low', text: 'Good week! No major threats detected.' });
  return recs;
}

// ─── WEEKLY REPORT - SEND TO ALL USERS (cron job) ────────────────────────
exports.sendWeeklyReports = async () => {
  try {
    const users = await User.find({});
    console.log(`📊 Generating weekly reports for ${users.length} users...`);
    // In production: send email via nodemailer
    // For now: just log
    for (const user of users) {
      console.log(`📧 Weekly report ready for: ${user.email}`);
    }
  } catch (e) { console.error('Weekly report error:', e); }
};
