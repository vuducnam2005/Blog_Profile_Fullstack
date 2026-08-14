import { useEffect, useRef, useState } from 'react';

// Local scene data avoids an iframe swallowing scroll and click events.
const SPLINE_SCENE_URL = '/nexbot.splinecode';

export default function SplineBackground() {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    let spline = null;
    let isDisposed = false;

    const loadScene = async () => {
      const { Application } = await import('@splinetool/runtime');
      if (isDisposed) return;

      spline = new Application(canvas);
      await spline.load(SPLINE_SCENE_URL);

      if (isDisposed) return;

      // Global events let the robot follow the cursor through page content.
      spline.setGlobalEvents(true);
      setIsLoaded(true);
    };

    loadScene().catch((error) => {
      if (!isDisposed) console.error('Unable to load the Nexbot Spline scene.', error);
    });

    return () => {
      isDisposed = true;
      spline?.dispose();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 h-full w-full overflow-hidden bg-[#040608] pointer-events-none"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.12),transparent_52%),linear-gradient(160deg,#071014_0%,#020304_72%)]"
        style={{ pointerEvents: 'none' }}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ pointerEvents: 'none' }}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className="nexbot-scene-shade absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />
      <div
        className="nexbot-scene-grid absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />
      <div
        className="nexbot-scene-vignette absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />
      <a
        href="https://spline.design/?utm_source=public-url&utm_campaign=spline-logo"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-5 right-5 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[10px] font-semibold tracking-wide text-white/70 backdrop-blur-md transition-colors hover:text-white"
        style={{ pointerEvents: 'auto' }}
      >
        Built with Spline
      </a>
    </div>
  );
}
