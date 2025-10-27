import csv
import json
import math
import random

input_csv = "rail_stop_ridership_table.csv"
output_geojson = "rail_ridership_hourly_sample.geojson"

features = []

with open(input_csv, newline='', encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    frontrunner_count = 0
    trax_count = 0
    
    for row in reader:
        mode = row.get('mode', '')
        
        # Get 20 FrontRunner stations
        if mode == 'Commuter Rail' and frontrunner_count < 20:
            frontrunner_count += 1
        # Get 30 TRAX stations  
        elif mode == 'Light Rail' and trax_count < 30:
            trax_count += 1
        else:
            continue
            
        if frontrunner_count + trax_count >= 50:
            break

        # For demo, create a random position in SLC if no real geocode
        lat = 40.76 + random.uniform(-0.04, 0.04)
        lon = -111.89 + random.uniform(-0.03, 0.03)

        # Use average boardings to create a daily ridership pattern
        try:
            avg_board = float(row.get('avgboardings', 25))
        except Exception:
            avg_board = 25

        hourly = [max(0, int(avg_board / 24 + 0.7 * avg_board * math.sin((h-7)/24*2*math.pi))) for h in range(24)]

        # Map the mode to our expected values
        if mode == 'Light Rail':
            mode = 'TRAX'
        elif mode == 'Commuter Rail':
            mode = 'Commuter Rail'  # Keep as is for FrontRunner
        
        feature = {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [lon, lat] },
            "properties": {
                "NAME": row.get('stopname', ''),
                "MODE": mode,
                "LINE": row.get('route', ''),
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

print(f"Saved {len(features)} rail stops to {output_geojson}")
print(f"FrontRunner: {frontrunner_count}, TRAX: {trax_count}")
