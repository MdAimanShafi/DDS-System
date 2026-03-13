class RiskEngine {
  constructor() {
    this.weights = {
      BRUTE_FORCE: 40,
      NEW_DEVICE: 30,
      NEW_IP: 30,
      SUSPICIOUS_LOCATION: 25,
      RAPID_ATTEMPTS: 35,
      MULTIPLE_FAILURES: 20,
      IMPOSSIBLE_TRAVEL: 50,
      KNOWN_MALICIOUS_IP: 60
    };
    
    this.attemptTimestamps = new Map();
  }

  calculateRiskScore(factors) {
    let score = 0;
    const reasons = [];
    
    // Brute force detection
    if (factors.loginAttempts > 5) {
      score += this.weights.BRUTE_FORCE;
      reasons.push('🚨 Brute force attack detected');
    }
    
    // Multiple failures
    if (factors.loginAttempts > 3 && factors.loginAttempts <= 5) {
      score += this.weights.MULTIPLE_FAILURES;
      reasons.push('⚠️ Multiple failed login attempts');
    }
    
    // New device detection
    if (factors.isNewDevice) {
      score += this.weights.NEW_DEVICE;
      reasons.push('📱 Login from unknown device');
    }
    
    // New IP detection
    if (factors.isNewIP) {
      score += this.weights.NEW_IP;
      reasons.push('🌐 Login from new IP address');
    }
    
    // Rapid attempts detection
    if (factors.rapidAttempts) {
      score += this.weights.RAPID_ATTEMPTS;
      reasons.push('⚡ Rapid login attempts detected');
    }
    
    // Suspicious location
    if (factors.suspiciousLocation) {
      score += this.weights.SUSPICIOUS_LOCATION;
      reasons.push('📍 Login from suspicious location');
    }
    
    // Impossible travel detection
    if (factors.impossibleTravel) {
      score += this.weights.IMPOSSIBLE_TRAVEL;
      reasons.push('✈️ Impossible travel detected');
    }
    
    return {
      score: Math.min(score, 100),
      reasons
    };
  }

  getRiskLevel(score) {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  shouldLockAccount(score) {
    return score > 70;
  }

  getRecommendedAction(score) {
    if (score >= 80) return 'IMMEDIATE_LOCKDOWN';
    if (score >= 60) return 'REQUIRE_2FA';
    if (score >= 40) return 'SEND_ALERT';
    return 'MONITOR';
  }

  getScoreDetails(score) {
    return {
      score,
      level: this.getRiskLevel(score),
      shouldLock: this.shouldLockAccount(score),
      action: this.getRecommendedAction(score)
    };
  }
  
  // Track rapid login attempts
  trackLoginAttempt(identifier) {
    const now = Date.now();
    if (!this.attemptTimestamps.has(identifier)) {
      this.attemptTimestamps.set(identifier, []);
    }
    
    const timestamps = this.attemptTimestamps.get(identifier);
    timestamps.push(now);
    
    // Keep only last 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentAttempts = timestamps.filter(t => t > fiveMinutesAgo);
    this.attemptTimestamps.set(identifier, recentAttempts);
    
    return recentAttempts.length;
  }
  
  isRapidAttempt(identifier) {
    const attempts = this.trackLoginAttempt(identifier);
    return attempts > 3;
  }
  
  // Detect impossible travel (login from different countries in short time)
  detectImpossibleTravel(lastLocation, currentLocation, lastLoginTime) {
    if (!lastLocation || !currentLocation || !lastLoginTime) return false;
    
    const timeDiff = (Date.now() - new Date(lastLoginTime).getTime()) / 1000 / 60 / 60; // hours
    
    // If different countries and less than 2 hours
    if (lastLocation.country !== currentLocation.country && timeDiff < 2) {
      return true;
    }
    
    return false;
  }
}

module.exports = new RiskEngine();
