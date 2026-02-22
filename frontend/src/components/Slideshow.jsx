import { useState, useEffect, useCallback } from 'react';

const SLIDES = [
  {
    title: null,
    content: (
      <>
        <h1 className="slide-hero">AquaGrid</h1>
        <p className="slide-tagline">
          Simulating the water impact of tomorrow's data centers before they're built.
        </p>
        <p className="slide-sub">
          Lightweight analytical tool for civic planners in Northern Virginia.
        </p>
      </>
    ),
  },
  {
    title: 'The Problem',
    content: (
      <>
        <p className="slide-lead">
          Northern Virginia is the largest data center hub in the world.
        </p>
        <p className="slide-but">But:</p>
        <ul className="slide-list">
          <li>Water demand from data centers is opaque.</li>
          <li>Cooling methods drastically change water consumption.</li>
          <li>Planners lack fast, scenario-based modeling tools.</li>
          <li>Public discussions rely on fragmented numbers and PDFs.</li>
        </ul>
        <p className="slide-close">
          Today: evaluating water impact requires manual spreadsheets and guesswork.
        </p>
      </>
    ),
  },
  {
    title: 'Why This Matters Now',
    content: (
      <>
        <p className="slide-lead">
          AI growth → Larger hyperscale facilities → Increased cooling demand.
        </p>
        <p>Even a single 50–100 MW facility can:</p>
        <ul className="slide-list">
          <li>Add hundreds of thousands of gallons per day</li>
          <li>Meaningfully shift local water withdrawal percentages</li>
          <li>Trigger infrastructure upgrades</li>
        </ul>
        <p className="slide-close">Planners need clarity before permits are approved.</p>
      </>
    ),
  },
  {
    title: 'Our Solution',
    content: (
      <>
        <p className="slide-lead">
          AquaGrid is a lightweight analytical simulation tool that:
        </p>
        <ul className="slide-list">
          <li>Visualizes existing data centers (via OpenStreetMap)</li>
          <li>Displays baseline county water withdrawal</li>
          <li>Allows planners to propose a new data center</li>
          <li>Calculates % strain on county water systems instantly</li>
        </ul>
        <p className="slide-close">All in a single interactive map.</p>
      </>
    ),
  },
  {
    title: 'How It Works',
    content: (
      <>
        <ol className="slide-list slide-list-ol">
          <li>User clicks anywhere in Northern Virginia</li>
          <li>System auto-assigns county</li>
          <li>
            User inputs:
            <ul>
              <li>MW capacity</li>
              <li>Cooling type (air / hybrid / evaporative)</li>
            </ul>
          </li>
          <li>
            AquaGrid calculates:
            <br />
            <strong>Water Strain (%) = New Demand / Total County Withdrawal</strong>
          </li>
        </ol>
        <p className="slide-close">Instant, transparent, reproducible.</p>
      </>
    ),
  },
  {
    title: 'Live Simulation Example',
    content: (
      <>
        <p className="slide-lead">Example:</p>
        <p>
          <strong>50 MW</strong> data center · <strong>Evaporative</strong> cooling
        </p>
        <p className="slide-result">
          → ~250,000 gallons/day
          <br />
          → 0.78% increase in Loudoun County withdrawal
        </p>
        <p className="slide-close">The tool makes tradeoffs visible.</p>
        <p className="slide-sub">Change cooling → See strain drop instantly.</p>
      </>
    ),
  },
  {
    title: 'Technical Stack',
    content: (
      <>
        <div className="slide-cols">
          <div>
            <h3>Frontend</h3>
            <ul className="slide-list-compact">
              <li>React</li>
              <li>Mapbox GL</li>
            </ul>
          </div>
          <div>
            <h3>Backend</h3>
            <ul className="slide-list-compact">
              <li>FastAPI</li>
              <li>GeoPandas + Shapely for spatial logic</li>
            </ul>
          </div>
          <div>
            <h3>Data</h3>
            <ul className="slide-list-compact">
              <li>Overpass Turbo (OSM data center polygons)</li>
              <li>Static county water withdrawal baselines (MVP)</li>
            </ul>
          </div>
        </div>
        <p className="slide-close">Fast, lightweight, deterministic.</p>
      </>
    ),
  },
  {
    title: "Why It's Different",
    content: (
      <>
        <div className="slide-cols">
          <div>
            <h3>Most dashboards</h3>
            <ul className="slide-list-compact">
              <li>Show static data</li>
              <li>Don't allow forward simulation</li>
            </ul>
          </div>
          <div>
            <h3>AquaGrid</h3>
            <ul className="slide-list-compact">
              <li>Is interactive and scenario-based</li>
              <li>Makes invisible infrastructure strain visible</li>
              <li>Bridges energy, AI growth, and water policy</li>
            </ul>
          </div>
        </div>
        <p className="slide-close">This is decision-support, not just visualization.</p>
      </>
    ),
  },
  {
    title: 'Future Roadmap',
    content: (
      <>
        <p className="slide-lead">Next phases:</p>
        <ul className="slide-list">
          <li>Permit capacity modeling</li>
          <li>Multi-state expansion (TX, CA)</li>
          <li>Indirect water (power generation) modeling</li>
          <li>Comparative scenario mode</li>
          <li>Exportable policy reports</li>
        </ul>
      </>
    ),
  },
];

export default function Slideshow({ onClose }) {
  const [index, setIndex] = useState(0);
  const total = SLIDES.length;

  const go = useCallback(
    (delta) => {
      setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
    },
    [total]
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, go]);

  const slide = SLIDES[index];

  return (
    <div className="slideshow-overlay" role="dialog" aria-label="AquaGrid slideshow">
      <button
        type="button"
        className="slideshow-close"
        onClick={onClose}
        aria-label="Close slideshow"
      >
        &#x2715;
      </button>

      <div className="slideshow-nav slideshow-prev">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous slide"
        >
          &#x2039;
        </button>
      </div>
      <div className="slideshow-nav slideshow-next">
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === total - 1}
          aria-label="Next slide"
        >
          &#x203A;
        </button>
      </div>

      <div className="slideshow-slide">
        <div className="slideshow-inner">
          {slide.title && <h2 className="slide-title">{slide.title}</h2>}
          <div className="slide-body">{slide.content}</div>
        </div>
      </div>

      <div className="slideshow-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`slideshow-dot ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index ? 'true' : undefined}
          />
        ))}
      </div>

      <div className="slideshow-counter">
        {index + 1} / {total}
      </div>
    </div>
  );
}
