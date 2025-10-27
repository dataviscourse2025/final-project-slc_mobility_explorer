import csv
import json
import math
import random

input_csv = "bus_stop_ridership_table.csv"
output_geojson = "bus_ridership_hourly_sample.geojson"

features = []
# Bus stops don't have lat/lon in this CSV, so we'll create random positions in SLC area
# In real implementation, you'd need to geocode these or join with a stops file

with open(input_csv, newline='', encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for i, row in enumerate(reader):
        if i >= 30:  # Limit to 30 bus stops for demo
            break

        # Random position in Salt Lake City area
        lat = 40.76 + random.uniform(-0.04, 0.04)
        lon = -111.89 + random.uniform(-0.03, 0.03)

        # Get average boardings
        try:
            avg_board = float(row.get('avgboardings', 10))
        except Exception:
            avg_board = 10

        # Create hourly pattern (bus typically has different pattern than rail)
        hourly = [max(0, int(avg_board / 24 + 0.5 * avg_board * math.sin((h-7)/24*2*math.pi))) for h in range(24)]

        # Extract route numbers from routes field (e.g., "39,227" -> "Bus 39")
        routes = row.get('routes', '').split(',')
        primary_route = routes[0].strip() if routes else 'Bus'
        line_name = f"Bus {primary_route}" if primary_route.isdigit() else f"Bus {primary_route}"

        feature = {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [lon, lat] },
            "properties": {
                "NAME": row.get('stopname', ''),
                "MODE": "Bus",
                "LINE": line_name,
                "hourly_counts": hourly
            }
        }
        features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(output_geojson, "w", encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)

print(f"Saved {len(features)} bus stops to {output_geojson}")
