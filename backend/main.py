from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from shapely.geometry import shape, Point
from enum import Enum
from pathlib import Path
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
    "air_cooled": 0,
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
                   "Click within Arlington, Loudoun, Fairfax, or Prince William County.",
        )

    multiplier = COOLING_MULTIPLIERS[req.cooling_type.value]
    daily_water_gpd = req.mw * multiplier

    if matched["total_withdrawal_gpd"] == 0:
        raise HTTPException(status_code=500, detail="County water withdrawal data unavailable.")

    strain_percent = (daily_water_gpd / matched["total_withdrawal_gpd"]) * 100

    return SimulationResponse(
        county=matched["name"],
        county_id=matched["county_id"],
        mw=req.mw,
        cooling_type=req.cooling_type.value,
        daily_water_gpd=daily_water_gpd,
        strain_percent=round(strain_percent, 4),
        total_withdrawal_gpd=matched["total_withdrawal_gpd"],
    )
