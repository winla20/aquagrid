import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { runSimulation } from '../api';

const COOLING = [
  { value: 'air_cooled', label: 'Air Cooled', rate: '0 GPD / MW' },
  { value: 'hybrid', label: 'Hybrid', rate: '2,500 GPD / MW' },
  { value: 'evaporative', label: 'Evaporative', rate: '5,000 GPD / MW' },
];

function fmt(n) {
  return n.toLocaleString('en-US');
}

function strainColor(pct) {
  if (pct < 1) return 'var(--c-strain-low)';
  if (pct <= 3) return 'var(--c-strain-mid)';
  return 'var(--c-strain-high)';
}

function strainTag(pct) {
  if (pct < 1) return 'LOW';
  if (pct <= 3) return 'MODERATE';
  return 'HIGH';
}

export default function SimPanel() {
  const loc = useStore((s) => s.proposalLocation);
  const result = useStore((s) => s.simulationResult);
  const loading = useStore((s) => s.isLoading);
  const error = useStore((s) => s.error);
  const setResult = useStore((s) => s.setSimulationResult);
  const setLoading = useStore((s) => s.setIsLoading);
  const setError = useStore((s) => s.setError);
  const reset = useStore((s) => s.reset);

  const [mw, setMw] = useState('');
  const [cooling, setCooling] = useState('');

  useEffect(() => {
    if (loc && !result) {
      setMw('');
      setCooling('');
    }
  }, [loc, result]);

  async function handleRun() {
    const mwVal = parseFloat(mw);
    if (!mw || mwVal <= 0) return setError('MW capacity must be greater than 0.');
    if (!cooling) return setError('Select a cooling system type.');

    setLoading(true);
    setError(null);

    try {
      const res = await runSimulation({
        lat: loc.lat,
        lng: loc.lng,
        mw: mwVal,
        cooling_type: cooling,
      });
      setResult(res);
    } catch (e) {
      setError(e.response?.data?.detail || 'Simulation failed — check backend.');
    }
  }

  /* ---------- IDLE ---------- */
  if (!loc) {
    return (
      <aside className="panel">
        <div className="panel-chrome">
          <span className="chrome-dot" />
          <span className="chrome-title">AQUAGRID CONTROL</span>
        </div>
        <div className="panel-body idle-body">
          <svg className="idle-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M24 4C16.27 4 10 10.27 10 18c0 11 14 26 14 26s14-15 14-26c0-7.73-6.27-14-14-14z" />
            <circle cx="24" cy="18" r="5" />
          </svg>
          <h2 className="idle-heading">Select Location</h2>
          <p className="idle-desc">
            Click anywhere on the map to propose a new data center site.
            Simulation covers three Northern Virginia counties.
          </p>
          <div className="idle-tags">
            {['Loudoun', 'Fairfax', 'Prince William'].map((c) => (
              <span key={c} className="tag">{c}</span>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  /* ---------- RESULTS ---------- */
  if (result) {
    const sc = strainColor(result.strain_percent);
    const st = strainTag(result.strain_percent);
    const barW = Math.min(result.strain_percent * 20, 100);

    return (
      <aside className="panel panel-results">
        <div className="panel-chrome">
          <span className="chrome-dot" style={{ background: sc }} />
          <span className="chrome-title">STRAIN ANALYSIS</span>
        </div>
        <div className="panel-body">
          <div className="strain-hero" style={{ '--sc': sc }}>
            <div className="strain-pct">{result.strain_percent.toFixed(2)}<small>%</small></div>
            <div className="strain-badge" style={{ color: sc }}>{st} STRAIN</div>
            <div className="strain-bar">
              <div className="strain-bar-track">
                <div className="strain-bar-fill" style={{ width: `${barW}%`, background: sc }} />
              </div>
            </div>
          </div>

          <div className="result-table">
            <Row label="COUNTY" value={result.county} />
            <Row label="CAPACITY" value={`${result.mw} MW`} />
            <Row label="COOLING" value={result.cooling_type.replace(/_/g, ' ').toUpperCase()} />
            <Row label="DEMAND" value={`${fmt(result.daily_water_gpd)} GPD`} accent />
            <Row label="BASELINE" value={`${fmt(result.total_withdrawal_gpd)} GPD`} />
          </div>

          <button className="btn btn-primary" onClick={reset}>
            <span className="btn-icon">&#x21bb;</span> NEW SIMULATION
          </button>
        </div>
      </aside>
    );
  }

  /* ---------- CONFIGURE ---------- */
  return (
    <aside className="panel panel-config">
      <div className="panel-chrome">
        <span className="chrome-dot" />
        <span className="chrome-title">CONFIGURE FACILITY</span>
      </div>
      <div className="panel-body">
        <div className="loc-block">
          <div className="loc-row">
            <span className="loc-label">COORDINATES</span>
            <span className="loc-val mono">
              {loc.lat.toFixed(4)}°N&ensp;{Math.abs(loc.lng).toFixed(4)}°W
            </span>
          </div>
          <div className="loc-row">
            <span className="loc-label">COUNTY</span>
            <span className="loc-val accent">{loc.county}</span>
          </div>
        </div>

        <label className="field-label">MW CAPACITY</label>
        <input
          className="field-input"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 50"
          value={mw}
          onChange={(e) => setMw(e.target.value)}
        />

        <label className="field-label">COOLING SYSTEM</label>
        <div className="cool-grid">
          {COOLING.map((c) => (
            <button
              key={c.value}
              className={`cool-btn${cooling === c.value ? ' active' : ''}`}
              onClick={() => setCooling(c.value)}
            >
              <span className="cool-name">{c.label}</span>
              <span className="cool-rate">{c.rate}</span>
            </button>
          ))}
        </div>

        {error && <p className="field-error">{error}</p>}

        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={handleRun}
        >
          {loading ? (
            <>
              <span className="spinner" /> CALCULATING&hellip;
            </>
          ) : (
            <>&#9654;&ensp;RUN SIMULATION</>
          )}
        </button>

        <button className="btn btn-ghost" onClick={reset}>
          CANCEL
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="rt-row">
      <span className="rt-label">{label}</span>
      <span className={`rt-value${accent ? ' accent' : ''}`}>{value}</span>
    </div>
  );
}
