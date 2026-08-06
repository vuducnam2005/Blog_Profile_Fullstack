import { useEffect, useRef } from 'react';
import { startBlackHoleBackground } from '../background/performanceBridge';

export default function BlackHoleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let stopFn = null;
    const timer = setTimeout(() => {
      stopFn = startBlackHoleBackground();
    }, 50);

    return () => {
      clearTimeout(timer);
      if (typeof stopFn === 'function') {
        stopFn();
      }
    };
  }, []);

  return (
    <canvas
      id="webgl-canvas"
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none block"
    />
  );
}
