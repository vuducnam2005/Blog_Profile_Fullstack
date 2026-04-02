import React, { createContext, useState, useContext } from 'react';

export const AuthContext = createContext();

// Simple admin key used for API authorization header
export const ADMIN_API_KEY = 'DucNamAdmin2005SecretKey';

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem('isAdmin') === 'true';
  });

  const login = () => {
    setIsAdmin(true);
    sessionStorage.setItem('isAdmin', 'true');
  };

  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('isAdmin');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
