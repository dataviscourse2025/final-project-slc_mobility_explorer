// --- Mode Switch UI ---
document.getElementById('traffic-btn').onclick = setTrafficMode;
document.getElementById('transit-btn').onclick = setTransitMode;

let currentMode = 'traffic';
function setTrafficMode() {
  currentMode = 'traffic';
  document.getElementById('traffic-btn').classList.add('mode-active');
  document.getElementById('transit-btn').classList.remove('mode-active');
  if (roadLayer && map.hasLayer(roadLayer)) {
    map.addLayer(roadLayer);
  }
  if (transitLayer && map.hasLayer(transitLayer)) {
    map.removeLayer(transitLayer);
  }
  // Show traffic, hide transit
  if (trafficGeojson) renderTraffic(trafficGeojson, currentHour);
}
function setTransitMode() {
  currentMode = 'transit';
  document.getElementById('traffic-btn').classList.remove('mode-active');
  document.getElementById('transit-btn').classList.add('mode-active');
  if (roadLayer && map.hasLayer(roadLayer)) {
    map.removeLayer(roadLayer);
  }
  // Show transit, hide traffic
  if (transitGeojson) renderTransit(transitGeojson, currentHour);
}

// --- Map Setup/Color Functions ---
const map = L.map('map').setView([40.7608, -111.891], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© OpenStreetMap contributors'}).addTo(map);
function getColor(volume) {
  if (volume < 500) return 'yellow';
  if (volume < 1000) return 'orange';
  return 'red';
}
// Transit color mapping by MODE and LINE
const lineColorLookup = {
  "Red Line": "#e52527",
  "Blue Line": "#2b60bf", 
  "Green Line": "#47ac43",
  "FrontRunner": "#00B379",
  "Bus 2": "#02bbec",
  "Bus 72": "#7d58a6",
  "Bus 603": "#f77200"
};
function getTransitColor(mode, line) {
  // Check for specific line colors first
  if (lineColorLookup[line]) return lineColorLookup[line];
  
  // Fallback by mode
  if (mode === 'Commuter Rail') return '#00B379';  // FrontRunner
  if (mode === 'TRAX') return '#008ecf';
  if (mode === 'Bus') return '#E8961F';
  if (mode === 'Light Rail') return '#008ecf';
  return '#666';
}

// --- Layers ---
let roadLayer = null, trafficGeojson = null;
let transitLayer = null;
let currentHour = 8;

// --- Traffic logic as before ---
function renderTraffic(geojson, hour) {
  if (roadLayer) {try { map.removeLayer(roadLayer); } catch (e) {} roadLayer = null;}
  roadLayer = L.geoJSON(geojson, {
    style: f => {const vs = f.properties.hourly_counts || []; return {color:getColor(vs[hour]??0),weight:5};},
    onEachFeature: (f, l) => {const v=(f.properties.hourly_counts||[])[hour]??0;l.bindTooltip(`<strong>${f.properties.LOCATION}</strong><br>Volume (this hour): ${v}`);}
  });
  if (currentMode==='traffic') roadLayer.addTo(map);
}

fetch('traffic_hourly_slc_sample.geojson').then(r=>r.json()).then(json=>{trafficGeojson=json;renderTraffic(trafficGeojson,currentHour);});

// --- Load real transit ridership data (combined rail + bus) ---
let transitGeojson = null;
fetch('transit_combined_hourly.geojson').then(resp => resp.json()).then(geojson => {
  transitGeojson = geojson;
  if (currentMode === 'transit') renderTransit(transitGeojson, currentHour);
});

function renderTransit(geojson, hour) {
  if (transitLayer) {try{map.removeLayer(transitLayer);}catch(e){}transitLayer=null;}
  transitLayer = L.geoJSON(geojson, {
    pointToLayer: (feature, latlng) => {
      const counts = feature.properties.hourly_counts||[];
      const mode = feature.properties.MODE||'';
      const line = feature.properties.LINE||'';
      const v = counts[hour] || 0;
      // Circle radius: min 5, max 30; proportional to counts (demo scale)
      const r = Math.min(30, Math.max(5, v/10));
      return L.circleMarker(latlng, {
        radius: r,
        color: getTransitColor(mode, line),
        fillColor: getTransitColor(mode, line),
        fillOpacity: 0.5,
        opacity: 0.9,
        weight: 2
      });
    },
    onEachFeature: (feature, layer) => {
      const v = (feature.properties.hourly_counts||[])[hour]||0;
      const mode = feature.properties.MODE||'';
      const line = feature.properties.LINE||'';
      layer.bindTooltip(`<strong>${feature.properties.NAME}</strong><br>Line: ${line}<br>Ridership (this hour): ${v}<br>Mode: ${mode}`);
    }
  });
  if (currentMode==='transit') transitLayer.addTo(map);
}

// --- Slider and Animation logic ---
const slider = document.getElementById('time-slider');
const hourLabel = document.getElementById('hour-label');
slider.addEventListener('input', () => {
  currentHour = Number(slider.value);
  hourLabel.textContent = `${String(currentHour).padStart(2, "0")}:00`;
  if(currentMode==='traffic'&&trafficGeojson)renderTraffic(trafficGeojson,currentHour);
  else if(currentMode==='transit'&&transitGeojson)renderTransit(transitGeojson,currentHour);
});
let playing = false,playInterval=null;
document.getElementById('play-btn').onclick = function() {
  if(!playing){ playing=true;this.textContent='Pause';playInterval = setInterval(()=>{
    let newValue=(Number(slider.value)+1)%24;
    slider.value=newValue;
    slider.dispatchEvent(new Event('input'));
  },800);}
  else{ playing=false;this.textContent='Play';clearInterval(playInterval);}
};
