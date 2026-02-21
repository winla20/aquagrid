import { useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import SimPanel from './components/SimPanel';
import { useStore } from './store';
import { fetchCounties, fetchDataCenters } from './api';

export default function App() {
  const setCounties = useStore((s) => s.setCounties);
  const setDataCenters = useStore((s) => s.setDataCenters);
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);

  useEffect(() => {
    Promise.all([
      fetchCounties().then(setCounties),
      fetchDataCenters().then(setDataCenters),
    ]).catch(() =>
      setToast('Failed to connect to AquaGrid backend.')
    );
  }, [setCounties, setDataCenters, setToast]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  const dismissToast = useCallback(() => setToast(null), [setToast]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="logo">
            <span className="logo-icon">&#9670;</span> AQUAGRID
          </h1>
          <span className="subtitle">NOVA WATER STRAIN MONITOR</span>
        </div>
        <div className="header-right">
          <div className="status-badge">
            <span className="status-dot" />
            <span>SYSTEM ACTIVE</span>
          </div>
        </div>
      </header>

      <main className="main">
        <MapView />
        <SimPanel />
      </main>

      <footer className="footer">
        <span className="footer-seg">AquaGrid v1.0 MVP</span>
        <span className="footer-seg counties-list">
          ARLINGTON&ensp;·&ensp;LOUDOUN&ensp;·&ensp;FAIRFAX&ensp;·&ensp;PRINCE
          WILLIAM
        </span>
        <span className="footer-seg mono" id="coords">
          —
        </span>
      </footer>

      {toast && (
        <div className="toast" key={toast}>
          <span>{toast}</span>
          <button className="toast-close" onClick={dismissToast}>
            &#x2715;
          </button>
        </div>
      )}
    </div>
  );
}
