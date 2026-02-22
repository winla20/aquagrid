import { useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import SimPanel from './components/SimPanel';
import Slideshow from './components/Slideshow';
import { useStore } from './store';
import { fetchCounties, fetchDataCenters, fetchUtilities } from './api';

export default function App() {
  const setCounties = useStore((s) => s.setCounties);
  const setDataCenters = useStore((s) => s.setDataCenters);
  const setUtilities = useStore((s) => s.setUtilities);
  const toast = useStore((s) => s.toast);
  const setToast = useStore((s) => s.setToast);
  const showSlideshow = useStore((s) => s.showSlideshow);
  const setShowSlideshow = useStore((s) => s.setShowSlideshow);

  useEffect(() => {
    Promise.all([
      fetchCounties().then(setCounties),
      fetchDataCenters().then(setDataCenters),
      fetchUtilities().then(setUtilities),
    ]).catch(() =>
      setToast('Failed to connect to AquaGrid backend.')
    );
  }, [setCounties, setDataCenters, setUtilities, setToast]);

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
        <button
          type="button"
          className="about-trigger"
          onClick={() => setShowSlideshow(true)}
        >
          About AquaGrid
        </button>
      </main>

      {showSlideshow && (
        <Slideshow onClose={() => setShowSlideshow(false)} />
      )}

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
