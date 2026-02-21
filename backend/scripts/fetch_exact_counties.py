"""
Fetch exact county boundaries from US Census TIGER/Line and write
backend/data/counties.geojson with our schema (county_id, name,
total_withdrawal_gpd, area_sq_mi). Run from repo root or backend/:
  pip install pyshp requests
  python backend/scripts/fetch_exact_counties.py
"""
import json
import zipfile
import tempfile
import urllib.request
from pathlib import Path

try:
    import shapefile
except ImportError:
    raise SystemExit("Install pyshp: pip install pyshp")

# NoVA counties (Census NAMELSAD -> county_id, total_withdrawal_gpd, area_sq_mi)
NOVA = {
    "Fairfax County": ("fairfax", 120_000_000, 395),
    "Loudoun County": ("loudoun", 32_000_000, 520),
    "Prince William County": ("prince_william", 45_000_000, 348),
}

CENSUS_URL = "https://www2.census.gov/geo/tiger/TIGER2023/COUNTY/tl_2023_us_county.zip"
BACKEND = Path(__file__).resolve().parent.parent
OUT_PATH = BACKEND / "data" / "counties.geojson"


def main():
    print("Downloading TIGER 2023 county boundaries...")
    with tempfile.TemporaryDirectory() as tmp:
        zip_path = Path(tmp) / "tl_2023_us_county.zip"
        urllib.request.urlretrieve(CENSUS_URL, zip_path)
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(tmp)
        shp_path = Path(tmp) / "tl_2023_us_county.shp"
        if not shp_path.exists():
            raise SystemExit("Expected tl_2023_us_county.shp in zip")
        reader = shapefile.Reader(str(shp_path))
        fields = [f[0] for f in reader.fields[1:]]
        # Expect STATEFP, COUNTYFP, NAME, NAMELSAD, ...
        state_idx = fields.index("STATEFP") if "STATEFP" in fields else None
        name_idx = fields.index("NAMELSAD") if "NAMELSAD" in fields else fields.index("NAME")
        if state_idx is None:
            raise SystemExit("STATEFP not in shapefile fields")
        features = []
        for i, shape in enumerate(reader.shapes()):
            rec = reader.record(i)
            if rec[state_idx] != "51":
                continue
            name = rec[name_idx]
            if name not in NOVA:
                continue
            county_id, withdrawal, area_sq_mi = NOVA[name]
            geom = shape.__geo_interface__
            features.append({
                "type": "Feature",
                "properties": {
                    "county_id": county_id,
                    "name": name,
                    "total_withdrawal_gpd": withdrawal,
                    "area_sq_mi": area_sq_mi,
                },
                "geometry": geom,
            })
        reader.close()
    if len(features) != 3:
        raise SystemExit(f"Expected 3 features, got {len(features)}: {[f['properties']['name'] for f in features]}")
    fc = {"type": "FeatureCollection", "features": features}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"), ensure_ascii=False)
    print(f"Wrote {OUT_PATH} with exact Census boundaries.")


if __name__ == "__main__":
    main()
