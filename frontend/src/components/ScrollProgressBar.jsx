import { useEffect, useRef } from 'react';

export default function ScrollProgressBar() {
  const progressRef = useRef(null);

  useEffect(() => {
    const progressElement = progressRef.current;
    if (!progressElement) return undefined;

    let animationFrameId = null;
    let willChangeTimer = null;

    const updateProgress = () => {
      animationFrameId = null;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0
        ? Math.min(1, Math.max(0, window.scrollY / totalHeight))
        : 0;

      progressElement.style.transform = `scaleX(${progress})`;
      window.clearTimeout(willChangeTimer);
      willChangeTimer = window.setTimeout(() => {
        progressElement.style.willChange = '';
      }, 180);
    };

    const scheduleUpdate = () => {
      progressElement.style.willChange = 'transform';
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(scheduleUpdate)
      : null;
    resizeObserver?.observe(document.documentElement);
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      resizeObserver?.disconnect();
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(willChangeTimer);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-transparent" aria-hidden="true">
      <div
        ref={progressRef}
        className="h-full w-full origin-left bg-gradient-to-r from-[#F1D89E] via-amber-400 to-[#00D0C8] shadow-[0_0_12px_rgba(241,216,158,0.9),0_0_6px_rgba(0,208,200,0.8)] transition-transform duration-100 ease-out rounded-r-full"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
