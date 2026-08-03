import { useState, useEffect } from 'react';

export default function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(currentProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-[#F1D89E] via-amber-400 to-[#00D0C8] shadow-[0_0_12px_rgba(241,216,158,0.9),0_0_6px_rgba(0,208,200,0.8)] transition-all duration-100 ease-out rounded-r-full"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
}
