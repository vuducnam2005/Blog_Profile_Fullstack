import { useEffect, useRef } from 'react';
import { startBlackHoleBackground } from '../background/performanceBridge';
import GlassShatterOverlay from './GlassShatterOverlay';

export default function BlackHoleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let stopFn = null;
    const rafId = requestAnimationFrame(() => {
      stopFn = startBlackHoleBackground();
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (typeof stopFn === 'function') {
        stopFn();
      }
    };
  }, []);

  return (
    <>
      <canvas
        id="webgl-canvas"
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none block"
      />
      <GlassShatterOverlay />
    </>
  );
}
