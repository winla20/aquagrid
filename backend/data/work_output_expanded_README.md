# Northern Virginia Water + Data Center Context (Reduced Scope)

Deliverables for Loudoun, Fairfax, and Prince William, VA.

## Files
- `utilities.csv`: public water systems/providers intersecting the target counties (join key: `utility_id` = EPA PWSID).
- `utility_service_areas.geojson` and `utility_service_areas.gpkg`: EPA SAB-derived service-area polygons for the utilities above.
- `data_centers.csv`: data center points (existing/proposed) within ~15 miles of target counties, with inside/outside flags.
- `sources_metadata.csv`: source inventory with links, retrieval timestamp, license notes, and caveats.

## Join keys
- Utilities: `utility_id` (EPA PWSID)
- Counties: `county_fips` (5-digit) + `county_name`

## Important caveats
- `utilities.csv` inclusion is based on **EPA service-area polygon intersection** with county boundaries; it is not a fully verified retail-service roster.
- The service-area polygons come from EPA SAB (may be official or modeled/approximate); see `boundary_quality` and `method_notes` in polygon layer.
- Data center layer is compiled by PEC from public information; may be incomplete or contain errors; use as context only.
