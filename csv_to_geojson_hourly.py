import csv
import json
import math
from shapely.geometry import shape, LineString, Point

input_csv = "2013_AADT_20251026.csv"
boundary_geojson = "Salt_Lake_City_Boundary.geojson"
output_geojson = "traffic_hourly_slc_sample.geojson"

# Load SLC boundary polygon
with open(boundary_geojson) as f:
    city_geo = json.load(f)
    city_poly = shape(city_geo['features'][0]['geometry'])

features = []
with open(input_csv, newline='', encoding="utf-8") as csvfile:
    reader = csv.DictReader(csvfile)
    for i, row in enumerate(reader):
        if len(features) >= 300:
            break
        try:
            aadt = int(row['AADT2013'].replace(',', ''))
            hourly = [max(0, int(aadt / 24 + 0.6 * aadt * math.sin((h-7) / 24 * 2 * math.pi))) for h in range(24)]
        except Exception:
            continue
        geom = row['the_geom'].replace("MULTILINESTRING ((", "").replace("))", "")
        if not geom:
            continue
        line_coords = []
        for pt in geom.split(","):
            pt = pt.strip(" ()")
            try:
                lng, lat = map(float, pt.split())
                line_coords.append([lng, lat])
            except Exception:
                continue
        if not line_coords:
            continue
        line = LineString(line_coords)
        # Use center of line for containment test
        center = Point(line.centroid)
        if not city_poly.contains(center):
            continue
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": line_coords
            },
            "properties": {
                "ROUTE_NAME": row.get('ROUTE_NAME', ''),
                "LOCATION": row.get('LOCATION', ''),
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

print(f"Saved {len(features)} roads inside SLC boundary to {output_geojson}")