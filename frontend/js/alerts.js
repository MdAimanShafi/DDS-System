// Enhanced Alerts Manager with Real-time Notifications
class AlertsManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.alerts = [];
    this.maxAlerts = 50;
  }

  addAlert(alert) {
    const alertElement = this.createAlertElement(alert);
    
    if (this.container) {
      const emptyState = this.container.querySelector('.empty-state');
      if (emptyState) {
        this.container.innerHTML = '';
      }
      
      this.container.insertBefore(alertElement, this.container.firstChild);
      
      // Animate in
      setTimeout(() => {
        alertElement.style.opacity = '1';
        alertElement.style.transform = 'translateX(0)';
      }, 10);
      
      // Keep only max alerts
      const allAlerts = this.container.querySelectorAll('.alert-item');
      if (allAlerts.length > this.maxAlerts) {
        allAlerts[allAlerts.length - 1].remove();
      }
    }
    
    this.alerts.unshift(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.pop();
    }
    
    // Play sound for critical alerts
    if (alert.riskLevel === 'critical' || alert.riskLevel === 'high') {
      this.playAlertSound();
    }
  }

  createAlertElement(alert) {
    const div = document.createElement('div');
    div.className = `alert-item ${alert.riskLevel || 'medium'}`;
    div.style.cssText = `
      opacity: 0;
      transform: translateX(-20px);
      transition: all 0.3s ease;
    `;
    
    const timestamp = new Date(alert.timestamp).toLocaleString();
    const location = alert.location || 'Unknown';
    const icon = this.getRiskIcon(alert.riskLevel);
    
    div.innerHTML = `
      <div class="alert-header">
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
          <div class="alert-title">${alert.message}</div>
          <div class="alert-meta">
            <span>📧 ${alert.email || 'Unknown'}</span>
            <span>🌐 ${alert.ip || 'Unknown'}</span>
            <span>📍 ${location}</span>
            <span>🕒 ${timestamp}</span>
          </div>
        </div>
        <div class="alert-badge ${alert.riskLevel}">${(alert.riskLevel || 'medium').toUpperCase()}</div>
      </div>
    `;
    
    return div;
  }

  getRiskIcon(riskLevel) {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return icons[riskLevel] || '🔔';
  }

  playAlertSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Audio not supported');
    }
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div class="empty-state-title">No Alerts</div>
          <div class="empty-state-text">All clear! No security alerts at this time.</div>
        </div>
      `;
    }
    this.alerts = [];
  }

  getAlerts() {
    return this.alerts;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AlertsManager;
}
