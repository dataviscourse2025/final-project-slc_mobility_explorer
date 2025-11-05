# Salt Lake City Mobility Explorer

Interactive web visualization showing Salt Lake City's traffic and transit patterns throughout the day.

## 🚀 Quick Start

Open `index.html` in your browser. Toggle between Traffic and Transit modes, use the time slider to see hourly patterns.

## 📊 Features

**Traffic Mode**: Animated road heatmap (yellow = low, red = high congestion)
**Transit Mode**: Animated circles showing ridership at stations
- 🟢 FrontRunner, 🔴 TRAX Red, 🔵 TRAX Blue, 🟢 TRAX Green, 🟠 Bus stops

## 🔧 Setup

1. Install Python dependencies:
   ```bash
   pip install shapely pandas
   ```

2. Generate data:
   ```bash
   python csv_to_geojson_hourly.py
   python rail_csv_to_geojson_v2.py
   python bus_csv_to_geojson.py
   python combine_transit_data.py
   ```

3. Open `index.html` in browser

## 📁 Key Files

- `index.html` - Main interface
- `script.js` - Map logic
- `transit_combined_hourly.geojson` - Transit data
- `traffic_hourly_slc_sample.geojson` - Traffic data

## 📈 Data Sources

- UDOT Traffic Data (AADT)
- Utah Open Data Portal (UTA Ridership)
- Salt Lake City Boundary

Built for DS 4630 Data Science Visualization course.
