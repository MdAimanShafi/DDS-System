// ============================================
// Attack Map Manager - Leaflet.js Integration
// ============================================

class AttackMapManager {
  constructor(mapElementId) {
    this.mapElementId = mapElementId;
    this.map = null;
    this.markers = [];
  }

  initialize() {
    try {
      const mapElement = document.getElementById(this.mapElementId);
      if (!mapElement) {
        console.error('Map element not found');
        return;
      }

      // Initialize Leaflet map
      this.map = L.map(this.mapElementId).setView([20, 0], 2);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(this.map);

      console.log('✅ Attack map initialized');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  addAttackMarker(attack) {
    if (!this.map || !attack.location) return;

    try {
      const { lat, lon, city, country } = attack.location;
      
      if (!lat || !lon) return;

      // Determine marker color based on risk level
      let markerColor = '#10b981'; // green
      if (attack.riskLevel === 'critical') markerColor = '#ef4444';
      else if (attack.riskLevel === 'high') markerColor = '#f59e0b';
      else if (attack.riskLevel === 'medium') markerColor = '#3b82f6';

      // Create custom icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: ${markerColor};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>`,
        iconSize: [20, 20]
      });

      // Create marker
      const marker = L.marker([lat, lon], { icon }).addTo(this.map);

      // Create popup
      const popupContent = `
        <div style="font-family: sans-serif; min-width: 200px;">
          <h4 style="margin: 0 0 10px 0; color: ${markerColor}; font-size: 14px;">
            ${attack.attackType}
          </h4>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Location:</strong> ${city}, ${country}
          </p>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>IP:</strong> ${attack.ipAddress}
          </p>
          <p style="margin: 5px 0; font-size: 12px;">
            <strong>Risk:</strong> <span style="color: ${markerColor}; font-weight: bold;">${attack.riskLevel.toUpperCase()}</span>
          </p>
          <p style="margin: 5px 0; font-size: 11px; color: #666;">
            ${new Date(attack.timestamp).toLocaleString()}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);

      this.markers.push(marker);

      // Auto-open popup for critical attacks
      if (attack.riskLevel === 'critical') {
        marker.openPopup();
        this.map.setView([lat, lon], 6);
      }
    } catch (error) {
      console.error('Error adding marker:', error);
    }
  }

  clearMarkers() {
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];
  }
}
