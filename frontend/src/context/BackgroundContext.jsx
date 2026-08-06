import { createContext, useState } from 'react';

export const BackgroundContext = createContext({
  bgMode: 'video',
  toggleBgMode: () => {},
});

export function BackgroundProvider({ children }) {
  const [bgMode, setBgMode] = useState(() => {
    try {
      return localStorage.getItem('appBgMode') || 'video';
    } catch {
      return 'video';
    }
  });

  const toggleBgMode = () => {
    setBgMode((prev) => {
      const next = prev === 'video' ? 'blackhole' : 'video';
      try {
        localStorage.setItem('appBgMode', next);
      } catch {
        // Fallback
      }
      return next;
    });
  };

  return (
    <BackgroundContext.Provider value={{ bgMode, toggleBgMode }}>
      {children}
    </BackgroundContext.Provider>
  );
}
