// ============================================
// Attack Map Manager - REAL IP & Geolocation
// ============================================

class AttackMapManager {
  constructor(mapElementId) {
    this.mapElementId = mapElementId;
    this.map = null;
    this.markers = [];
    this.markerCluster = null;
    this.heatmapLayer = null;
  }

  initialize() {
    try {
      const mapElement = document.getElementById(this.mapElementId);
      if (!mapElement) {
        console.error('❌ Map element not found');
        return;
      }

      // Initialize Leaflet map with better view
      this.map = L.map(this.mapElementId, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true
      });

      // Add multiple tile layers for better visualization
      const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
      });

      const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CartoDB',
        maxZoom: 18
      });

      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 18
      });

      // Add default layer
      darkLayer.addTo(this.map);

      // Add layer control
      const baseLayers = {
        'Dark Mode': darkLayer,
        'Street View': streetLayer,
        'Satellite': satelliteLayer
      };

      L.control.layers(baseLayers).addTo(this.map);

      // Add scale control
      L.control.scale({
        imperial: false,
        metric: true
      }).addTo(this.map);

      // Add legend
      this.addLegend();

      console.log('✅ Attack map initialized with real geolocation');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  addLegend() {
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'map-legend');
      div.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        padding: 15px;
        border-radius: 12px;
        color: white;
        font-size: 12px;
        line-height: 1.8;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;
      
      div.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">🗺️ Attack Risk Levels</div>
        <div><span style="color: #ef4444;">●</span> Critical</div>
        <div><span style="color: #f59e0b;">●</span> High</div>
        <div><span style="color: #3b82f6;">●</span> Medium</div>
        <div><span style="color: #10b981;">●</span> Low</div>
      `;
      
      return div;
    };

    legend.addTo(this.map);
  }

  addAttackMarker(attack) {
    if (!this.map || !attack.location) {
      console.log('⚠️ Map or location not available');
      return;
    }

    try {
      const { lat, lon, city, country, region, isp, timezone } = attack.location;
      
      if (!lat || !lon || lat === 0 || lon === 0) {
        console.log('⚠️ Invalid coordinates, skipping marker');
        return;
      }

      // Determine marker color and icon based on risk level
      let markerColor = '#10b981'; // green
      let riskIcon = '✓';
      let pulseClass = 'pulse-low';
      
      if (attack.riskLevel === 'critical') {
        markerColor = '#ef4444';
        riskIcon = '🚨';
        pulseClass = 'pulse-critical';
      } else if (attack.riskLevel === 'high') {
        markerColor = '#f59e0b';
        riskIcon = '⚠️';
        pulseClass = 'pulse-high';
      } else if (attack.riskLevel === 'medium') {
        markerColor = '#3b82f6';
        riskIcon = 'ℹ️';
        pulseClass = 'pulse-medium';
      }

      // Create custom animated icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-container ${pulseClass}">
            <div class="marker-pulse" style="background: ${markerColor};"></div>
            <div class="marker-icon" style="background: ${markerColor}; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
              <span style="font-size: 16px;">${riskIcon}</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      // Create marker
      const marker = L.marker([lat, lon], { icon }).addTo(this.map);

      // Format timestamp
      const timestamp = new Date(attack.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // Create detailed popup with real data
      const popupContent = `
        <div style="font-family: 'Segoe UI', sans-serif; min-width: 280px; max-width: 320px;">
          <div style="background: ${markerColor}; color: white; padding: 12px; margin: -10px -10px 12px -10px; border-radius: 8px 8px 0 0;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">
              ${riskIcon} ${attack.attackType}
            </h3>
          </div>
          
          <div style="padding: 0 4px;">
            <div style="margin-bottom: 12px;">
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong style="color: #333;">📧 Email:</strong><br>
                <span style="color: #667eea; font-weight: 600;">${attack.email}</span>
              </div>
              
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong style="color: #333;">🌐 IP Address:</strong><br>
                <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${attack.ipAddress}</code>
              </div>
              
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong style="color: #333;">📍 Location:</strong><br>
                ${city}, ${region}<br>
                ${country} ${attack.location.countryCode ? `(${attack.location.countryCode})` : ''}
              </div>
              
              ${isp ? `
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                  <strong style="color: #333;">🏢 ISP:</strong><br>
                  ${isp}
                </div>
              ` : ''}
              
              ${timezone ? `
                <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                  <strong style="color: #333;">🕐 Timezone:</strong> ${timezone}
                </div>
              ` : ''}
              
              <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
                <strong style="color: #333;">💻 Device:</strong><br>
                <span style="font-size: 11px; color: #888;">${attack.deviceInfo.substring(0, 60)}...</span>
              </div>
              
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px; color: #888;">
                    🕒 ${timestamp}
                  </span>
                  <span style="
                    background: ${markerColor}; 
                    color: white; 
                    padding: 4px 10px; 
                    border-radius: 12px; 
                    font-size: 11px; 
                    font-weight: 700;
                    text-transform: uppercase;
                  ">
                    ${attack.riskLevel}
                  </span>
                </div>
              </div>
              
              ${attack.blocked ? `
                <div style="margin-top: 8px; background: #fee2e2; color: #991b1b; padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 600; text-align: center;">
                  🚫 IP BLOCKED
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 350,
        className: 'custom-popup'
      });

      // Store marker
      this.markers.push(marker);

      // Auto-open popup for critical attacks
      if (attack.riskLevel === 'critical') {
        marker.openPopup();
        this.map.setView([lat, lon], 6, {
          animate: true,
          duration: 1
        });
        
        // Add pulsing effect
        setTimeout(() => {
          marker.openPopup();
        }, 500);
      }

      // Add connecting line from previous attack (if exists)
      if (this.markers.length > 1) {
        const prevMarker = this.markers[this.markers.length - 2];
        const prevLatLng = prevMarker.getLatLng();
        const currentLatLng = marker.getLatLng();
        
        const polyline = L.polyline([prevLatLng, currentLatLng], {
          color: markerColor,
          weight: 2,
          opacity: 0.4,
          dashArray: '5, 10'
        }).addTo(this.map);
      }

      console.log(`✅ Marker added: ${city}, ${country} (${lat}, ${lon})`);
    } catch (error) {
      console.error('❌ Error adding marker:', error);
    }
  }

  clearMarkers() {
    this.markers.forEach(marker => this.map.removeLayer(marker));
    this.markers = [];
    console.log('🗑️ All markers cleared');
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

  fitAllMarkers() {
    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}

// Add CSS for marker animations
const style = document.createElement('style');
style.textContent = `
  .marker-container {
    position: relative;
    width: 40px;
    height: 40px;
  }

  .marker-pulse {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    opacity: 0;
  }

  .pulse-critical .marker-pulse {
    animation: pulse-critical 2s ease-out infinite;
  }

  .pulse-high .marker-pulse {
    animation: pulse-high 2s ease-out infinite;
  }

  .pulse-medium .marker-pulse {
    animation: pulse-medium 2s ease-out infinite;
  }

  .pulse-low .marker-pulse {
    animation: pulse-low 2s ease-out infinite;
  }

  @keyframes pulse-critical {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes pulse-high {
    0% {
      transform: scale(0.5);
      opacity: 0.8;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  @keyframes pulse-medium {
    0% {
      transform: scale(0.5);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  @keyframes pulse-low {
    0% {
      transform: scale(0.5);
      opacity: 0.4;
    }
    100% {
      transform: scale(1.3);
      opacity: 0;
    }
  }

  .marker-icon {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.3s ease;
  }

  .marker-icon:hover {
    transform: scale(1.2);
  }

  .custom-popup .leaflet-popup-content-wrapper {
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    padding: 10px;
  }

  .custom-popup .leaflet-popup-tip {
    display: none;
  }
`;
document.head.appendChild(style);
