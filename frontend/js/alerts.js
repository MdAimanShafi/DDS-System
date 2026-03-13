// ============================================
// Alerts Manager - Security Alerts Display
// ============================================

class AlertsManager {
  constructor(containerElementId) {
    this.containerElementId = containerElementId;
    this.alerts = [];
  }

  addAlert(alert) {
    try {
      const container = document.getElementById(this.containerElementId);
      if (!container) {
        console.error('Alerts container not found');
        return;
      }

      // Remove empty state if exists
      const emptyState = container.querySelector('.empty-state');
      if (emptyState) {
        emptyState.remove();
      }

      // Create alert element
      const alertElement = this.createAlertElement(alert);
      
      // Add to beginning of container
      container.insertBefore(alertElement, container.firstChild);

      // Store alert
      this.alerts.unshift(alert);

      // Keep only last 20 alerts
      if (this.alerts.length > 20) {
        this.alerts.pop();
        const lastAlert = container.lastChild;
        if (lastAlert) lastAlert.remove();
      }

      console.log('✅ Alert added:', alert.message);
    } catch (error) {
      console.error('Error adding alert:', error);
    }
  }

  createAlertElement(alert) {
    const div = document.createElement('div');
    div.className = `alert-item ${alert.riskLevel || 'medium'}`;

    const timestamp = new Date(alert.timestamp || Date.now()).toLocaleTimeString();
    const location = alert.location || 'Unknown location';

    div.innerHTML = `
      <div class="alert-header">
        <div class="alert-title">${alert.message}</div>
        <div class="alert-time">${timestamp}</div>
      </div>
      <div class="alert-details">
        ${alert.email ? `<div>📧 ${alert.email}</div>` : ''}
        ${alert.ip ? `<div>🌐 ${alert.ip}</div>` : ''}
      </div>
      <div class="alert-location">
        📍 ${location}
      </div>
    `;

    return div;
  }

  clearAlerts() {
    const container = document.getElementById(this.containerElementId);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🛡️</div>
          <div class="empty-state-title">No Security Alerts</div>
          <div class="empty-state-text">Your account is secure.</div>
        </div>
      `;
      this.alerts = [];
    }
  }
}
