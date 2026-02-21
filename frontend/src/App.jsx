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
      <main className="main">
        <MapView />
        <SimPanel />
      </main>

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
