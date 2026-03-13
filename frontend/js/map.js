// Enhanced Attack Map Manager with Real-time Visualization
class AttackMapManager {
  constructor(mapId) {
    this.mapId = mapId;
    this.map = null;
    this.markers = [];
    this.maxMarkers = 100;
    this.attackLines = [];
  }

  initialize() {
    try {
      // Initialize Leaflet map
      this.map = L.map(this.mapId, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: false
      });

      // Add dark theme tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(this.map);

      console.log('✅ Attack map initialized');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  addAttackMarker(attack) {
    if (!this.map || !attack.location) return;

    const { lat, lon, city, country } = attack.location;
    
    if (!lat || !lon) return;

    // Create custom icon based on risk level
    const icon = this.createCustomIcon(attack.riskLevel);

    // Create marker
    const marker = L.marker([lat, lon], { icon })
      .addTo(this.map)
      .bindPopup(this.createPopupContent(attack));

    // Animate marker
    const markerElement = marker.getElement();
    if (markerElement) {
      markerElement.style.animation = 'markerPulse 1s ease-out';
    }

    // Add to markers array
    this.markers.push(marker);

    // Remove old markers if exceeding max
    if (this.markers.length > this.maxMarkers) {
      const oldMarker = this.markers.shift();
      this.map.removeLayer(oldMarker);
    }

    // Draw attack line from origin
    this.drawAttackLine([lat, lon]);

    // Pan to new attack
    this.map.setView([lat, lon], 5, {
      animate: true,
      duration: 1
    });
  }

  createCustomIcon(riskLevel) {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6'
    };

    const color = colors[riskLevel] || colors.medium;

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 20px ${color}, 0 0 40px ${color};
          animation: pulse 2s infinite;
        "></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  }

  createPopupContent(attack) {
    const timestamp = new Date(attack.timestamp).toLocaleString();
    const location = attack.location ? `${attack.location.city}, ${attack.location.country}` : 'Unknown';

    return `
      <div style="font-family: 'Inter', sans-serif; min-width: 200px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1f2937;">
          ${attack.attackType}
        </div>
        <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
          <div style="margin-bottom: 4px;">
            <strong>📧 Email:</strong> ${attack.email}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>🌐 IP:</strong> ${attack.ipAddress}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>📍 Location:</strong> ${location}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>⚠️ Risk:</strong> 
            <span style="
              background: ${this.getRiskColor(attack.riskLevel)};
              color: white;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 10px;
            ">${attack.riskLevel.toUpperCase()}</span>
          </div>
          <div>
            <strong>🕒 Time:</strong> ${timestamp}
          </div>
        </div>
      </div>
    `;
  }

  getRiskColor(riskLevel) {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6'
    };
    return colors[riskLevel] || colors.medium;
  }

  drawAttackLine(targetCoords) {
    // Draw line from center to attack location
    const centerCoords = [20, 0];
    
    const line = L.polyline([centerCoords, targetCoords], {
      color: '#ef4444',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 10'
    }).addTo(this.map);

    // Fade out and remove line after 3 seconds
    setTimeout(() => {
      this.map.removeLayer(line);
    }, 3000);
  }

  clearMarkers() {
    this.markers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  focusOnMarker(index) {
    if (this.markers[index]) {
      const marker = this.markers[index];
      this.map.setView(marker.getLatLng(), 8, {
        animate: true,
        duration: 1
      });
      marker.openPopup();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AttackMapManager;
}
