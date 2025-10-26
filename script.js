// Leaflet map (centered on Salt Lake City)
const map = L.map('map').setView([40.7608, -111.891], 12);

// OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

function getColor(volume) {
  if (volume < 500) return 'yellow';
  if (volume < 1000) return 'orange';
  return 'red';
}

let roadLayer = null;
let currentHour = 8;
let trafficGeojson = null;

function renderTraffic(geojson, hour) {
  if (roadLayer) {
    try { map.removeLayer(roadLayer); } catch (e) {}
    roadLayer = null;
  }
  roadLayer = L.geoJSON(geojson, {
    style: feature => {
      const hourly = feature.properties.hourly_counts || [];
      const v = hourly[hour] ?? 0;
      return { color: getColor(v), weight: 5 };
    },
    onEachFeature: (feature, layer) => {
      const v = (feature.properties.hourly_counts || [])[hour] ?? 0;
      layer.bindTooltip(
        `<strong>${feature.properties.LOCATION}</strong><br>Volume (this hour): ${v}`
      );
    }
  }).addTo(map);
}

// Use the sample file with animated hourly changes
fetch('traffic_hourly_slc_sample.geojson')
  .then(resp => resp.json())
  .then(geojson => {
    trafficGeojson = geojson;
    renderTraffic(trafficGeojson, currentHour);
  });

const slider = document.getElementById('time-slider');
const hourLabel = document.getElementById('hour-label');
slider.addEventListener('input', () => {
  currentHour = Number(slider.value);
  hourLabel.textContent = `${String(currentHour).padStart(2, "0")}:00`;
  if (trafficGeojson) renderTraffic(trafficGeojson, currentHour);
});

let playing = false;
let playInterval = null;
document.getElementById('play-btn').onclick = function() {
  if (!playing) {
    playing = true;
    this.textContent = 'Pause';
    playInterval = setInterval(() => {
      let newValue = (Number(slider.value) + 1) % 24;
      slider.value = newValue;
      slider.dispatchEvent(new Event('input'));
    }, 800);
  } else {
    playing = false;
    this.textContent = 'Play';
    clearInterval(playInterval);
  }
};
