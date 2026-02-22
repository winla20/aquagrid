from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from shapely.geometry import shape, Point
from enum import Enum
from pathlib import Path
import csv
import json

app = FastAPI(title="AquaGrid API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COOLING_MULTIPLIERS = {
    "air_cooled": 1000,
    "hybrid": 2500,
    "evaporative": 5000,
}

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"
ROOT_DIR = BASE.parent

with open(DATA_DIR / "counties.geojson", encoding="utf-8") as f:
    counties_geojson = json.load(f)

with open(ROOT_DIR / "nova_dc.geojson", encoding="utf-8") as f:
    datacenters_geojson = json.load(f)

county_shapes = []
for feature in counties_geojson["features"]:
    geom = shape(feature["geometry"])
    county_shapes.append({
        "name": feature["properties"]["name"],
        "county_id": feature["properties"]["county_id"],
        "total_withdrawal_gpd": feature["properties"]["total_withdrawal_gpd"],
        "geometry": geom,
        "area": geom.area,
    })

county_shapes.sort(key=lambda c: c["area"])

# Optional utility service-area layer (stepwise migration from county -> utility).
utility_shapes = []
utility_geojson_path = DATA_DIR / "work_output_expanded_utility_service_areas.geojson"
if utility_geojson_path.exists():
    with open(utility_geojson_path, encoding="utf-8") as f:
        utility_geojson = json.load(f)

    for feature in utility_geojson.get("features", []):
        props = feature.get("properties", {})
        utility_id = (props.get("utility_id") or "").strip()
        if not utility_id:
            continue
        utility_shapes.append({
            "utility_id": utility_id,
            "utility_name": (props.get("utility_name") or utility_id).strip(),
            "boundary_quality": (props.get("boundary_quality") or "unknown").strip(),
            "geometry": shape(feature["geometry"]),
            "area": shape(feature["geometry"]).area,
        })

    # Prefer smallest containing polygon in overlaps.
    utility_shapes.sort(key=lambda u: u["area"])


def _safe_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value):
    parsed = _safe_float(value)
    if parsed is None:
        return None
    return int(parsed)


def _read_csv_rows_with_fallback(path: Path):
    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):
        try:
            with open(path, encoding=encoding) as f:
                return list(csv.DictReader(f))
        except UnicodeDecodeError:
            continue
    with open(path, encoding="latin-1", errors="replace") as f:
        return list(csv.DictReader(f))


def _row_point(row):
    lat = _safe_float(row.get("Latitude_POU"))
    lng = _safe_float(row.get("Longitude_POU"))
    if lat is None or lng is None:
        lat = _safe_float(row.get("Latitude_POD"))
        lng = _safe_float(row.get("Longitude_POD"))
    if lat is None or lng is None:
        return None
    return Point(lng, lat)


def _match_utility(point: Point):
    for utility in utility_shapes:
        if utility["geometry"].contains(point):
            return utility
    return None


def _build_utility_baselines():
    if not utility_shapes:
        return {}

    path = DATA_DIR / "VA_USWWD_Water_Use_Characteristics.csv"
    if not path.exists():
        return {}

    min_year = 2020
    public_supply = {}
    all_categories = {}

    for row in _read_csv_rows_with_fallback(path):
        year = _safe_int(row.get("Year"))
        annual_mg = _safe_float(row.get("Annual_Volume_Million_Gallons"))
        if year is None or year < min_year or annual_mg is None or annual_mg <= 0:
            continue

        point = _row_point(row)
        if point is None:
            continue

        matched_utility = _match_utility(point)
        if not matched_utility:
            continue

        utility_id = matched_utility["utility_id"]
        all_categories.setdefault(utility_id, {})
        all_categories[utility_id][year] = all_categories[utility_id].get(year, 0.0) + annual_mg

        category = (row.get("USGS_Use_Category_Assigned_Simplified") or "").strip()
        if category == "Public_Supply":
            public_supply.setdefault(utility_id, {})
            public_supply[utility_id][year] = public_supply[utility_id].get(year, 0.0) + annual_mg

    baselines = {}
    for utility in utility_shapes:
        utility_id = utility["utility_id"]
        preferred = public_supply.get(utility_id) or all_categories.get(utility_id)
        if not preferred:
            continue
        source_year = max(preferred.keys())
        annual_mg = preferred[source_year]
        baselines[utility_id] = {
            "total_withdrawal_gpd": (annual_mg * 1_000_000) / 365.0,
            "source_year": source_year,
            "basis": "public_supply" if utility_id in public_supply else "all_categories",
        }
    return baselines


UTILITY_BASELINES = _build_utility_baselines()


class CoolingType(str, Enum):
    air_cooled = "air_cooled"
    hybrid = "hybrid"
    evaporative = "evaporative"


class SimulationRequest(BaseModel):
    lat: float = Field(..., ge=30, le=45)
    lng: float = Field(..., ge=-85, le=-70)
    mw: float = Field(..., gt=0)
    cooling_type: CoolingType


class SimulationResponse(BaseModel):
    county: str
    county_id: str
    utility_id: str | None = None
    utility_name: str | None = None
    boundary_quality: str | None = None
    model_mode: str = "county_only"
    baseline_scope: str = "county"
    baseline_source_year: int | None = None
    mw: float
    cooling_type: str
    daily_water_gpd: float
    strain_percent: float
    total_withdrawal_gpd: float


@app.get("/api/counties")
def get_counties():
    return counties_geojson


@app.get("/api/data-centers")
def get_data_centers():
    return datacenters_geojson


@app.get("/api/utilities")
def get_utilities():
    if not utility_geojson_path.exists():
        return {"type": "FeatureCollection", "features": []}
    return utility_geojson


@app.post("/api/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest):
    point = Point(req.lng, req.lat)

    matched = None
    for county in county_shapes:
        if county["geometry"].contains(point):
            matched = county
            break

    if not matched:
        raise HTTPException(
            status_code=400,
            detail="Simulation only supported in Northern Virginia (MVP). "
                   "Click within Loudoun, Fairfax, or Prince William County.",
        )

    multiplier = COOLING_MULTIPLIERS[req.cooling_type.value]
    daily_water_gpd = req.mw * multiplier

    matched_utility = _match_utility(point) if utility_shapes else None

    if matched["total_withdrawal_gpd"] == 0:
        raise HTTPException(status_code=500, detail="County water withdrawal data unavailable.")

    denominator_gpd = matched["total_withdrawal_gpd"]
    baseline_scope = "county"
    baseline_source_year = None
    model_mode = "county_only"

    if matched_utility:
        model_mode = "utility_location_county_fallback"
        utility_baseline = UTILITY_BASELINES.get(matched_utility["utility_id"])
        if utility_baseline and utility_baseline["total_withdrawal_gpd"] > 0:
            denominator_gpd = utility_baseline["total_withdrawal_gpd"]
            baseline_scope = f"utility_{utility_baseline['basis']}"
            baseline_source_year = utility_baseline["source_year"]
            model_mode = "utility_baseline"

    strain_percent = (daily_water_gpd / denominator_gpd) * 100

    return SimulationResponse(
        county=matched["name"],
        county_id=matched["county_id"],
        utility_id=matched_utility["utility_id"] if matched_utility else None,
        utility_name=matched_utility["utility_name"] if matched_utility else None,
        boundary_quality=matched_utility["boundary_quality"] if matched_utility else None,
        model_mode=model_mode,
        baseline_scope=baseline_scope,
        baseline_source_year=baseline_source_year,
        mw=req.mw,
        cooling_type=req.cooling_type.value,
        daily_water_gpd=daily_water_gpd,
        strain_percent=round(strain_percent, 4),
        total_withdrawal_gpd=denominator_gpd,
    )
