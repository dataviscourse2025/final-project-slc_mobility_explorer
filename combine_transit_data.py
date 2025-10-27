import json

# Load rail data
with open('rail_ridership_hourly_sample.geojson', 'r') as f:
    rail_data = json.load(f)

# Load bus data (run bus_csv_to_geojson.py first)
with open('bus_ridership_hourly_sample.geojson', 'r') as f:
    bus_data = json.load(f)

# Combine both datasets
combined_features = rail_data['features'] + bus_data['features']

combined_geojson = {
    "type": "FeatureCollection",
    "features": combined_features
}

# Save combined data
with open('transit_combined_hourly.geojson', 'w') as f:
    json.dump(combined_geojson, f, indent=2)

print(f"Combined {len(rail_data['features'])} rail stops + {len(bus_data['features'])} bus stops = {len(combined_features)} total transit stops")
