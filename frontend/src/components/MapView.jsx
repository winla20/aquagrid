import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '../store';

const STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function escapeHtml(s) {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
const CENTER = [-77.4, 38.95];
const ZOOM = 9;

export default function MapView() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [ready, setReady] = useState(false);

  const counties = useStore((s) => s.counties);
  const dataCenters = useStore((s) => s.dataCenters);
  const utilities = useStore((s) => s.utilities);
  const proposalLocation = useStore((s) => s.proposalLocation);
  const simulationResult = useStore((s) => s.simulationResult);

  /* ---- init map ---- */
  useEffect(() => {
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: CENTER,
      zoom: ZOOM,
      minZoom: 7,
      maxZoom: 17,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => setReady(true));

    map.on('click', (e) => {
      if (!map.getLayer('counties-fill')) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: ['counties-fill'] });

      if (hits.length > 0) {
        hits.sort((a, b) => a.properties.area_sq_mi - b.properties.area_sq_mi);
        const p = hits[0].properties;
        useStore.getState().setProposalLocation({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
          county: p.name,
          county_id: p.county_id,
        });
      } else {
        useStore.getState().setToast(
          'Simulation only supported in Northern Virginia (MVP).'
        );
      }
    });

    map.on('mousemove', (e) => {
      const el = document.getElementById('coords');
      if (el) {
        el.textContent =
          `${e.lngLat.lat.toFixed(4)}°N  ${Math.abs(e.lngLat.lng).toFixed(4)}°W`;
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  /* ---- add data layers ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    /* counties */
    if (counties && !map.getSource('counties')) {
      map.addSource('counties', { type: 'geojson', data: counties });

      map.addLayer({
        id: 'counties-fill',
        type: 'fill',
        source: 'counties',
        paint: {
          'fill-color': '#00d4aa',
          'fill-opacity': [
            'interpolate', ['linear'],
            ['get', 'total_withdrawal_gpd'],
            25000000, 0.04,
            120000000, 0.14,
          ],
        },
      });

      map.addLayer({
        id: 'counties-outline',
        type: 'line',
        source: 'counties',
        paint: {
          'line-color': '#00d4aa',
          'line-opacity': 0.3,
          'line-width': 1.5,
          'line-dasharray': [4, 3],
        },
      });

      map.addLayer({
        id: 'counties-highlight',
        type: 'line',
        source: 'counties',
        paint: {
          'line-color': '#00d4aa',
          'line-opacity': 0,
          'line-width': 3,
        },
        filter: ['==', ['get', 'county_id'], ''],
      });

      map.addLayer({
        id: 'county-labels',
        type: 'symbol',
        source: 'counties',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.12,
          'text-font': ['Open Sans Regular'],
        },
        paint: {
          'text-color': 'rgba(245,158,11,0.5)',
          'text-halo-color': 'rgba(6,9,15,0.9)',
          'text-halo-width': 2,
        },
      });

      map.on('mouseenter', 'counties-fill', () => {
        map.getCanvas().style.cursor = 'crosshair';
      });
      map.on('mouseleave', 'counties-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    /* data centers */
    if (dataCenters && !map.getSource('datacenters')) {
      map.addSource('datacenters', { type: 'geojson', data: dataCenters });

      map.addLayer({
        id: 'dc-fill',
        type: 'fill',
        source: 'datacenters',
        paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.28 },
      });

      map.addLayer({
        id: 'dc-outline',
        type: 'line',
        source: 'datacenters',
        paint: {
          'line-color': '#f59e0b',
          'line-opacity': 0.6,
          'line-width': 1,
        },
      });

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'dc-popup',
        offset: 12,
        maxWidth: '260px',
      });

      map.on('mouseenter', 'dc-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const p = e.features[0].properties;
        const name = p.name || 'Data Center';
        const sizerank = p.sizerank != null && p.sizerank !== '' ? String(p.sizerank) : null;
        const mw = p.mw != null && p.mw !== '' ? (typeof p.mw === 'number' ? p.mw : parseFloat(p.mw)) : null;
        const yearOp = p.year_operational != null && p.year_operational !== '' ? String(p.year_operational) : null;
        const location = p.location != null && p.location !== '' ? String(p.location) : null;
        const rows = [
          ['NAME', name],
          ...(mw != null && !Number.isNaN(mw) ? [['CAPACITY', `${mw} MW`]] : []),
          ...(yearOp ? [['YEAR OPERATIONAL', yearOp]] : []),
          ...(location ? [['LOCATION', location]] : []),
          ...(p.operator ? [['DEVELOPER', p.operator]] : []),
          ...(sizerank && sizerank.toLowerCase() !== 'unknown' ? [['SIZERANK', sizerank]] : []),
        ];
        const tableRows = rows
          .map(([label, value]) => `<div class="dc-rt-row"><span class="dc-rt-label">${label}</span><span class="dc-rt-value">${escapeHtml(value)}</span></div>`)
          .join('');
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div class="dc-popup-box">${tableRows}</div>`)
          .addTo(map);
      });

      map.on('mousemove', 'dc-fill', (e) => popup.setLngLat(e.lngLat));

      map.on('mouseleave', 'dc-fill', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    }

    /* utility service areas */
    if (utilities && !map.getSource('utilities')) {
      map.addSource('utilities', { type: 'geojson', data: utilities });

      map.addLayer({
        id: 'utilities-fill',
        type: 'fill',
        source: 'utilities',
        paint: {
          'fill-color': '#60a5fa',
          'fill-opacity': 0.05,
        },
      });

      map.addLayer({
        id: 'utilities-outline',
        type: 'line',
        source: 'utilities',
        paint: {
          'line-color': '#60a5fa',
          'line-width': 1,
          'line-opacity': 0.5,
        },
      });
    }
  }, [ready, counties, dataCenters, utilities]);

  /* ---- proposal marker ---- */
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    if (!proposalLocation || !mapRef.current) return;

    const el = document.createElement('div');
    el.className = 'proposal-marker';
    el.innerHTML =
      '<div class="pm-ring"></div><div class="pm-ring pm-ring-2"></div><div class="pm-dot"></div>';

    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([proposalLocation.lng, proposalLocation.lat])
      .addTo(mapRef.current);
  }, [proposalLocation]);

  /* ---- county highlight ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('counties-highlight')) return;

    if (simulationResult) {
      map.setFilter('counties-highlight', [
        '==', ['get', 'county_id'], simulationResult.county_id,
      ]);
      map.setPaintProperty('counties-highlight', 'line-opacity', 0.8);
    } else {
      map.setFilter('counties-highlight', ['==', ['get', 'county_id'], '']);
      map.setPaintProperty('counties-highlight', 'line-opacity', 0);
    }
  }, [simulationResult, ready]);

  return <div ref={containerRef} className="map-container" />;
}
