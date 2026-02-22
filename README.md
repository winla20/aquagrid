# AquaGrid — NOVA Water Strain Monitor

Web-based infrastructure simulation tool that evaluates the incremental water strain caused by proposed data center construction in Northern Virginia.

**MVP Scope:** Loudoun, Fairfax, and Prince William counties.

---

## Quick Start

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 2. Frontend (React + MapLibre GL)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. API requests are proxied to the backend.

---

## API Endpoints


| Method | Path                | Description                               |
| ------ | ------------------- | ----------------------------------------- |
| GET    | `/api/counties`     | County boundaries + water withdrawal data |
| GET    | `/api/data-centers` | OSM data center polygons                  |
| POST   | `/api/simulate`     | Run water strain simulation               |


### POST `/api/simulate`

```json
{
  "lat": 39.04,
  "lng": -77.49,
  "mw": 50,
  "cooling_type": "evaporative"
}
```

Cooling types: `air_cooled` (1,000 GPD/MW), `hybrid` (2,500 GPD/MW), `evaporative` (5,000 GPD/MW). Reference: ~2 million L/day per 100 MW for evaporative.

---

## Tech Stack

- **Backend:** FastAPI, Shapely (point-in-polygon), Uvicorn
- **Frontend:** React 18, MapLibre GL JS, Zustand, Vite
- **Map tiles:** CARTO Dark Matter (free, no token required)

---

## Data Sources

- **County boundaries:** US Census TIGER/Line 2023 (exact boundaries for 3 NoVA counties). To refresh: `pip install pyshp` then `python backend/scripts/fetch_exact_counties.py`.
- **Water withdrawal baselines:** Static county-level estimates (GPD)
- **Data centers:** OpenStreetMap via Overpass Turbo (`nova_dc.geojson`)

