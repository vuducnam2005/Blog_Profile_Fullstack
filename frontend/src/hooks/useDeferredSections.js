import { useEffect } from 'react';
import AOS from 'aos';

const RENDER_AHEAD_MARGIN = '1400px 0px';

export function useDeferredSections() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('.deferred-section'));
    if (sections.length === 0) return undefined;

    let refreshFrameId = null;
    const refreshAos = () => {
      if (refreshFrameId !== null) return;
      refreshFrameId = window.requestAnimationFrame(() => {
        refreshFrameId = null;
        AOS.refreshHard();
      });
    };

    if (typeof IntersectionObserver !== 'function') {
      sections.forEach((section) => {
        section.dataset.renderReady = 'true';
      });
      refreshAos();
      return () => {
        if (refreshFrameId !== null) window.cancelAnimationFrame(refreshFrameId);
      };
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.renderReady = 'true';
        observer.unobserve(entry.target);
        refreshAos();
      });
    }, { rootMargin: RENDER_AHEAD_MARGIN });

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
      if (refreshFrameId !== null) window.cancelAnimationFrame(refreshFrameId);
    };
  }, []);
}
