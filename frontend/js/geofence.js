// ─── Geo-Fence Settings Manager ───────────────────────────────────────────
// NOTE: API_URL is already defined in auth.js as 'http://localhost:5000'
let geoMap = null;
let pickMarker = null;
let zoneCircles = [];
let pickedLat = null, pickedLon = null;

// ─── Init ──────────────────────────────────────────────────────────────────
async function initGeoFence() {
  initGeoMap();
  await loadTrustedLocations();
}

// ─── Map Setup ─────────────────────────────────────────────────────────────
function initGeoMap() {
  if (geoMap) return;
  geoMap = L.map('geoFenceMap').setView([20.5937, 78.9629], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(geoMap);

  geoMap.on('click', (e) => {
    pickedLat = e.latlng.lat.toFixed(6);
    pickedLon = e.latlng.lng.toFixed(6);

    if (pickMarker) geoMap.removeLayer(pickMarker);
    pickMarker = L.marker([pickedLat, pickedLon], {
      icon: L.divIcon({
        className: '',
        html: '<div style="background:#6366f1;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(99,102,241,0.8)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })
    }).addTo(geoMap).bindPopup(`📍 ${pickedLat}, ${pickedLon}`).openPopup();

    document.getElementById('gfLat').value = pickedLat;
    document.getElementById('gfLon').value = pickedLon;
    document.getElementById('gfPickHint').textContent = `✅ Location picked: ${pickedLat}, ${pickedLon}`;
    document.getElementById('gfPickHint').style.color = '#10b981';
  });
}

// ─── Load & Render Trusted Locations ──────────────────────────────────────
async function loadTrustedLocations() {
  try {
    const res = await authenticatedRequest(`${API_URL}/geofence/locations`);
    const data = await res.json();
    if (!data.success) return;
    renderLocationsList(data.locations);
    renderMapZones(data.locations);
    updateGeoToggle(data.geoFencingEnabled);
  } catch (e) {
    console.error('GeoFence load error:', e);
  }
}

function renderLocationsList(locations) {
  const list = document.getElementById('trustedLocationsList');
  if (!list) return;
  if (!locations.length) {
    list.innerHTML = `<div class="gf-empty">📍 No trusted locations added yet. Click on the map to add one.</div>`;
    return;
  }
  list.innerHTML = locations.map(loc => `
    <div class="gf-location-item" id="loc-${loc._id}">
      <div class="gf-loc-icon">📍</div>
      <div class="gf-loc-info">
        <div class="gf-loc-name">${loc.name}</div>
        <div class="gf-loc-coords">${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)} · Radius: ${loc.radiusKm} km</div>
      </div>
      <button class="gf-delete-btn" onclick="deleteTrustedLocation('${loc._id}')">🗑️</button>
    </div>
  `).join('');
}

function renderMapZones(locations) {
  zoneCircles.forEach(c => geoMap.removeLayer(c));
  zoneCircles = [];
  locations.forEach(loc => {
    const circle = L.circle([loc.lat, loc.lon], {
      radius: loc.radiusKm * 1000,
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(geoMap).bindPopup(`<b>${loc.name}</b><br>Radius: ${loc.radiusKm} km`);
    const marker = L.marker([loc.lat, loc.lon], {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#10b981;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(16,185,129,0.8)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      })
    }).addTo(geoMap).bindPopup(`<b>✅ ${loc.name}</b><br>${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}`);
    zoneCircles.push(circle, marker);
  });
  if (locations.length) {
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lon]));
    geoMap.fitBounds(bounds.pad(0.3));
  }
}

function updateGeoToggle(enabled) {
  const toggle = document.getElementById('geoFenceToggle');
  const label = document.getElementById('geoFenceStatus');
  if (toggle) toggle.checked = enabled;
  if (label) {
    label.textContent = enabled ? '🟢 Geo-Fencing ENABLED' : '🔴 Geo-Fencing DISABLED';
    label.style.color = enabled ? '#10b981' : '#ef4444';
  }
}

// ─── Add Trusted Location ──────────────────────────────────────────────────
async function addTrustedLocation() {
  const name = document.getElementById('gfName').value.trim();
  const lat = parseFloat(document.getElementById('gfLat').value);
  const lon = parseFloat(document.getElementById('gfLon').value);
  const radiusKm = parseInt(document.getElementById('gfRadius').value) || 50;

  if (!name) return showGfError('Please enter a location name.');
  if (isNaN(lat) || isNaN(lon)) return showGfError('Please click on the map to pick a location.');

  const btn = document.getElementById('gfAddBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  try {
    const res = await authenticatedRequest(`${API_URL}/geofence/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, lat, lon, radiusKm })
    });
    const data = await res.json();
    if (data.success) {
      renderLocationsList(data.locations);
      renderMapZones(data.locations);
      document.getElementById('gfName').value = '';
      document.getElementById('gfLat').value = '';
      document.getElementById('gfLon').value = '';
      document.getElementById('gfRadius').value = '50';
      document.getElementById('gfPickHint').textContent = '🗺️ Click on the map to pick coordinates';
      document.getElementById('gfPickHint').style.color = 'rgba(255,255,255,0.5)';
      if (pickMarker) { geoMap.removeLayer(pickMarker); pickMarker = null; }
      pickedLat = null; pickedLon = null;
      showGfSuccess('✅ Trusted location added!');
    } else {
      showGfError(data.error || 'Failed to add location');
    }
  } catch (e) {
    showGfError('Server error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '➕ Add Location';
  }
}

// ─── Delete Trusted Location ───────────────────────────────────────────────
async function deleteTrustedLocation(id) {
  if (!confirm('Remove this trusted location?')) return;
  try {
    const res = await authenticatedRequest(`${API_URL}/geofence/locations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      renderLocationsList(data.locations);
      renderMapZones(data.locations);
      showGfSuccess('🗑️ Location removed.');
    }
  } catch (e) {
    showGfError('Delete failed: ' + e.message);
  }
}

// ─── Toggle Geo-Fencing ────────────────────────────────────────────────────
async function toggleGeoFencing() {
  try {
    const res = await authenticatedRequest(`${API_URL}/geofence/toggle`, { method: 'POST' });
    const data = await res.json();
    if (data.success) updateGeoToggle(data.geoFencingEnabled);
  } catch (e) {
    showGfError('Toggle failed: ' + e.message);
  }
}

// ─── Weekly Report Download ────────────────────────────────────────────────
async function downloadWeeklyReport(format) {
  const csvBtn = document.getElementById('weeklyReportBtnCSV');
  const jsonBtn = document.getElementById('weeklyReportBtnJSON');
  const activeBtn = format === 'csv' ? csvBtn : jsonBtn;
  const originalText = activeBtn ? activeBtn.textContent : '';
  if (activeBtn) { activeBtn.disabled = true; activeBtn.textContent = '⏳ Generating...'; }

  try {
    const res = await authenticatedRequest(`${API_URL}/geofence/weekly-report`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to generate report');

    if (format === 'csv') {
      triggerDownload(buildCSV(data.report), `dds-weekly-report-${today()}.csv`, 'text/csv');
    } else {
      triggerDownload(JSON.stringify(data.report, null, 2), `dds-weekly-report-${today()}.json`, 'application/json');
    }
    showGfSuccess('✅ Report downloaded!');
  } catch (e) {
    showGfError('Report error: ' + e.message);
  } finally {
    if (activeBtn) { activeBtn.disabled = false; activeBtn.textContent = originalText; }
  }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
}

function buildCSV(report) {
  const rows = [
    ['DDS Weekly Security Report'],
    ['Generated', new Date(report.generatedAt).toLocaleString()],
    ['Period', `${new Date(report.period.from).toLocaleDateString()} - ${new Date(report.period.to).toLocaleDateString()}`],
    ['User', report.user.name, report.user.email],
    [],
    ['SUMMARY'],
    ['Total Attacks', report.summary.totalAttacks],
    ['Critical Attacks', report.summary.criticalAttacks],
    ['High Attacks', report.summary.highAttacks],
    ['Panic Activations', report.summary.panicActivations],
    ['Unique Attacker IPs', report.summary.uniqueAttackerIPs],
    ['Current Risk Score', report.summary.currentRiskScore],
    [],
    ['ATTACKS BY TYPE'],
    ['Type', 'Count'],
    ...Object.entries(report.attacksByType || {}).map(([k, v]) => [k, v]),
    [],
    ['ATTACKS BY DAY'],
    ['Day', 'Count'],
    ...Object.entries(report.attacksByDay || {}).map(([k, v]) => [k, v]),
    [],
    ['RECOMMENDATIONS'],
    ['Level', 'Recommendation'],
    ...(report.recommendations || []).map(r => [r.level.toUpperCase(), r.text]),
    [],
    ['RECENT ATTACKS (last 20)'],
    ['Time', 'Type', 'IP', 'Location', 'Risk'],
    ...(report.recentAttacks || []).map(a => [
      new Date(a.timestamp).toLocaleString(),
      a.attackType,
      a.ipAddress,
      a.location ? `${a.location.city}, ${a.location.country}` : 'Unknown',
      a.riskLevel
    ])
  ];
  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function showGfError(msg) {
  const el = document.getElementById('gfMessage');
  if (!el) return;
  el.textContent = msg;
  el.className = 'gf-message error';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function showGfSuccess(msg) {
  const el = document.getElementById('gfMessage');
  if (!el) return;
  el.textContent = msg;
  el.className = 'gf-message success';
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}
