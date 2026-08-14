import { createContext, useState } from 'react';

export const BackgroundContext = createContext({
  bgMode: 'blackhole',
  toggleBgMode: () => {},
});

export function BackgroundProvider({ children }) {
  const [bgMode, setBgMode] = useState(() => {
    try {
      const storedMode = sessionStorage.getItem('appBgMode');
      return storedMode === 'spline' || storedMode === 'video' ? 'spline' : 'blackhole';
    } catch {
      return 'blackhole';
    }
  });

  const toggleBgMode = () => {
    setBgMode((prev) => {
      const next = prev === 'spline' ? 'blackhole' : 'spline';
      try {
        sessionStorage.setItem('appBgMode', next);
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
