// --- D3.js Map Setup ---
const width = 900;
const height = 700;
const center = [40.7608, -111.891]; // Salt Lake City center

// Create SVG container
const svg = d3.select('#map')
  .append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

// Create groups: tiles (background) and data (foreground)
const tilesGroup = svg.append('g').attr('class', 'tiles');
const g = svg.append('g').attr('class', 'data');

// Create tooltip element
const tooltip = d3.select('#tooltip');

// Set up projection (Web Mercator) - standard for tile compatibility
// Web Mercator uses a fixed scale at the equator
const projection = d3.geoMercator()
  .center(center.reverse()) // [lon, lat]
  .scale(50000)
  .translate([width / 2, height / 2]);

// Create path generator
const path = d3.geoPath().projection(projection);


// Tile functions - Web Mercator projection
// Convert lat/lon to Web Mercator meters
function lon2x(lon) {
  return lon * 20037508.34 / 180;
}

function lat2y(lat) {
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  return y * 20037508.34 / 180;
}

// Convert Web Mercator meters to tile coordinates
function x2tile(x, z) {
  return Math.floor((x + 20037508.34) / 40075016.68 * (1 << z));
}

function y2tile(y, z) {
  return Math.floor((20037508.34 - y) / 40075016.68 * (1 << z));
}

function tileUrl(x, y, z) {
  // OpenStreetMap tile server
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

// Convert tile coordinates to Web Mercator meters
function tile2x(x, z) {
  return (x / (1 << z)) * 40075016.68 - 20037508.34;
}

function tile2y(y, z) {
  return 20037508.34 - (y / (1 << z)) * 40075016.68;
}

function getTiles(transform) {
  const k = transform.k;
  const baseScale = projection.scale();
  const currentScale = baseScale * k;
  const z = Math.max(0, Math.min(18, Math.floor(Math.log2(currentScale / 256))));
  const tiles = [];
  
  // Get visible bounds in lat/lon using the current projection state
  const topLeft = projection.invert([0, 0]);
  const bottomRight = projection.invert([width, height]);
  
  if (!topLeft || !bottomRight) return tiles;
  
  const [lonMin, latMax] = topLeft;
  const [lonMax, latMin] = bottomRight;
  
  // Convert to Web Mercator coordinates
  const xMin = lon2x(lonMin);
  const xMax = lon2x(lonMax);
  const yMin = lat2y(latMin);
  const yMax = lat2y(latMax);
  
  // Calculate tile range
  const x0 = x2tile(xMin, z);
  const x1 = x2tile(xMax, z);
  const y0 = y2tile(yMax, z);
  const y1 = y2tile(yMin, z);
  
  // Add padding
  for (let x = Math.max(0, x0 - 1); x <= Math.min((1 << z) - 1, x1 + 1); ++x) {
    for (let y = Math.max(0, y0 - 1); y <= Math.min((1 << z) - 1, y1 + 1); ++y) {
      tiles.push([x, y, z]);
    }
  }
  
  return tiles;
}

function renderTiles(transform) {
  const tiles = getTiles(transform);
  const k = transform.k;
  
  const tile = tilesGroup.selectAll('image')
    .data(tiles, d => `${d[2]}/${d[0]}/${d[1]}`);
  
  tile.exit().remove();
  
  const tileEnter = tile.enter()
    .append('image')
    .attr('xlink:href', d => tileUrl(d[0], d[1], d[2]))
    .attr('width', 256)
    .attr('height', 256);
  
  // Position tiles using the same projection as the data
  // Each tile covers a specific lat/lon range
  tile.merge(tileEnter)
    .attr('x', d => {
      const [x, y, z] = d;
      const n = 1 << z;
      // Get the northwest corner of the tile in lat/lon
      const lon = (x / n) * 360 - 180;
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
      const projected = projection([lon, lat]);
      return projected ? projected[0] : 0;
    })
    .attr('y', d => {
      const [x, y, z] = d;
      const n = 1 << z;
      // Get the northwest corner of the tile in lat/lon
      const lon = (x / n) * 360 - 180;
      const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
      const projected = projection([lon, lat]);
      return projected ? projected[1] : 0;
    })
    .attr('width', d => {
      const [x, y, z] = d;
      const n = 1 << z;
      // Get width by calculating difference between tile corners
      const lon1 = (x / n) * 360 - 180;
      const lon2 = ((x + 1) / n) * 360 - 180;
      const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
      const p1 = projection([lon1, lat1]);
      const p2 = projection([lon2, lat1]);
      return p1 && p2 ? Math.abs(p2[0] - p1[0]) : 256 * k;
    })
    .attr('height', d => {
      const [x, y, z] = d;
      const n = 1 << z;
      // Get height by calculating difference between tile corners
      const lon = (x / n) * 360 - 180;
      const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
      const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
      const p1 = projection([lon, lat1]);
      const p2 = projection([lon, lat2]);
      return p1 && p2 ? Math.abs(p2[1] - p1[1]) : 256 * k;
    });
}

// Set up zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.5, 8])
  .on('zoom', (event) => {
    const transform = event.transform;
    // Update projection scale based on zoom
    const baseScale = 50000;
    projection.scale(baseScale * transform.k);
    projection.translate([width / 2 + transform.x, height / 2 + transform.y]);
    
    // Update data layer transform - don't apply transform to g, apply to projection instead
    // Clear transform on g since we're transforming the projection
    g.attr('transform', null);
    
    // Render tiles
    renderTiles(transform);
    
    // Update transit points position on zoom
    updateTransitPositions(transform);
    
    // Update traffic lines on zoom - path will use updated projection
    g.selectAll('.traffic-line').attr('d', path);
  });

svg.call(zoom);

// Initial zoom transform
const initialTransform = d3.zoomIdentity
  .translate(0, 0)
  .scale(1);
svg.call(zoom.transform, initialTransform);

// --- Mode Switch UI ---
let currentMode = 'traffic';
document.getElementById('traffic-btn').onclick = setTrafficMode;
document.getElementById('transit-btn').onclick = setTransitMode;

function setTrafficMode() {
  currentMode = 'traffic';
  document.getElementById('traffic-btn').classList.add('mode-active');
  document.getElementById('transit-btn').classList.remove('mode-active');
  // Update display attributes
  g.selectAll('.traffic-line').attr('display', 'block');
  g.selectAll('.transit-point').attr('display', 'none');
  if (trafficGeojson) renderTraffic(trafficGeojson, currentHour);
}

function setTransitMode() {
  currentMode = 'transit';
  document.getElementById('traffic-btn').classList.remove('mode-active');
  document.getElementById('transit-btn').classList.add('mode-active');
  // Update display attributes
  g.selectAll('.traffic-line').attr('display', 'none');
  g.selectAll('.transit-point').attr('display', 'block');
  if (transitGeojson) renderTransit(transitGeojson, currentHour);
}

// --- Color Functions ---
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

// --- Data Storage ---
let trafficGeojson = null;
let transitGeojson = null;
let currentHour = 8;

// --- Traffic Rendering ---
function renderTraffic(geojson, hour) {
  // Update existing traffic lines or create new ones
  const trafficLayer = g.selectAll('.traffic-line')
    .data(geojson.features);
  
  // Remove old lines
  trafficLayer.exit().remove();
  
  // Add new lines
  const enter = trafficLayer.enter()
    .append('path')
    .attr('class', 'traffic-line');
  
  // Merge enter and update
  trafficLayer.merge(enter)
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', d => {
      const counts = d.properties.hourly_counts || [];
      const volume = counts[hour] || 0;
      return getColor(volume);
    })
    .attr('stroke-width', 4)
    .attr('stroke-opacity', 0.8)
    .attr('display', currentMode === 'traffic' ? 'block' : 'none')
    .on('mouseover', function(event, d) {
      const counts = d.properties.hourly_counts || [];
      const volume = counts[hour] || 0;
      tooltip.transition()
        .duration(200)
        .style('opacity', 1);
      tooltip.html(`<strong>${d.properties.LOCATION || 'Location'}</strong><br>Volume (this hour): ${volume}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.transition()
        .duration(200)
        .style('opacity', 0);
    });
}

// Helper function to update transit point positions on zoom
function updateTransitPositions(transform) {
  g.selectAll('.transit-point')
    .attr('cx', d => {
      const [lon, lat] = d.geometry.coordinates;
      const projected = projection([lon, lat]);
      return projected ? projected[0] : 0;
    })
    .attr('cy', d => {
      const [lon, lat] = d.geometry.coordinates;
      const projected = projection([lon, lat]);
      return projected ? projected[1] : 0;
    });
}

// --- Transit Rendering ---
function renderTransit(geojson, hour) {
  // Update existing transit points or create new ones
  const transitLayer = g.selectAll('.transit-point')
    .data(geojson.features);
  
  // Remove old points
  transitLayer.exit().remove();
  
  // Add new points
  const enter = transitLayer.enter()
    .append('circle')
    .attr('class', 'transit-point');
  
  // Merge enter and update
  transitLayer.merge(enter)
    .attr('cx', d => {
      const [lon, lat] = d.geometry.coordinates;
      const projected = projection([lon, lat]);
      return projected ? projected[0] : 0;
    })
    .attr('cy', d => {
      const [lon, lat] = d.geometry.coordinates;
      const projected = projection([lon, lat]);
      return projected ? projected[1] : 0;
    })
    .attr('r', d => {
      const counts = d.properties.hourly_counts || [];
      const volume = counts[hour] || 0;
      return Math.min(30, Math.max(5, volume / 10));
    })
    .attr('fill', d => {
      const mode = d.properties.MODE || '';
      const line = d.properties.LINE || '';
      return getTransitColor(mode, line);
    })
    .attr('fill-opacity', 0.5)
    .attr('stroke', d => {
      const mode = d.properties.MODE || '';
      const line = d.properties.LINE || '';
      return getTransitColor(mode, line);
    })
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.9)
    .attr('display', currentMode === 'transit' ? 'block' : 'none')
    .on('mouseover', function(event, d) {
      const counts = d.properties.hourly_counts || [];
      const volume = counts[hour] || 0;
      const mode = d.properties.MODE || '';
      const line = d.properties.LINE || '';
      tooltip.transition()
        .duration(200)
        .style('opacity', 1);
      tooltip.html(`<strong>${d.properties.NAME || 'Stop'}</strong><br>Line: ${line}<br>Ridership (this hour): ${volume}<br>Mode: ${mode}`)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.transition()
        .duration(200)
        .style('opacity', 0);
    });
}

// --- Load Data ---
// Load boundary first, then load data after projection is fitted
fetch('Salt_Lake_City_Boundary.geojson')
  .then(response => response.json())
  .then(boundary => {
    // Fit projection to Salt Lake City boundary
    projection.fitSize([width - 40, height - 40], boundary);
    
    // Re-render tiles with fitted projection
    const initialTransform = d3.zoomIdentity.translate(0, 0).scale(1);
    renderTiles(initialTransform);
    
    // Now load traffic and transit data
    return Promise.all([
      fetch('traffic_hourly_slc_sample.geojson').then(r => r.json()),
      fetch('transit_combined_hourly.geojson').then(r => r.json())
    ]);
  })
  .then(([trafficData, transitData]) => {
    trafficGeojson = trafficData;
    transitGeojson = transitData;
    
    // Render initial data
    if (currentMode === 'traffic' && trafficGeojson) {
      renderTraffic(trafficGeojson, currentHour);
    } else if (currentMode === 'transit' && transitGeojson) {
      renderTransit(transitGeojson, currentHour);
    }
  })
  .catch(error => {
    console.error('Error loading data:', error);
    // Fallback: try loading data without boundary fitting
    fetch('traffic_hourly_slc_sample.geojson')
      .then(r => r.json())
      .then(json => {
        trafficGeojson = json;
        if (currentMode === 'traffic') renderTraffic(trafficGeojson, currentHour);
      });
    
    fetch('transit_combined_hourly.geojson')
      .then(resp => resp.json())
      .then(geojson => {
        transitGeojson = geojson;
        if (currentMode === 'transit') renderTransit(transitGeojson, currentHour);
      });
  });

// --- Slider and Animation logic ---
const slider = document.getElementById('time-slider');
const hourLabel = document.getElementById('hour-label');

slider.addEventListener('input', () => {
  currentHour = Number(slider.value);
  hourLabel.textContent = `${String(currentHour).padStart(2, "0")}:00`;
  if (currentMode === 'traffic' && trafficGeojson) {
    renderTraffic(trafficGeojson, currentHour);
  } else if (currentMode === 'transit' && transitGeojson) {
    renderTransit(transitGeojson, currentHour);
  }
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
