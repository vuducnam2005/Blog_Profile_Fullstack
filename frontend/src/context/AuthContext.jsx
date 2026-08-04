import React, { createContext, useState, useContext } from 'react';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

// Simple admin key used for API authorization header
export const ADMIN_API_KEY = 'DucNamAdmin2005SecretKey';

function readAdminSession() {
  try {
    return sessionStorage.getItem('isAdmin') === 'true';
  } catch {
    return false;
  }
}

function writeAdminSession(value) {
  try {
    if (value) {
      sessionStorage.setItem('isAdmin', 'true');
    } else {
      sessionStorage.removeItem('isAdmin');
    }
  } catch {
    // Admin state remains available in memory when storage is blocked.
  }
}

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(readAdminSession);

  const login = () => {
    setIsAdmin(true);
    writeAdminSession(true);
  };

  const logout = () => {
    setIsAdmin(false);
    writeAdminSession(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
