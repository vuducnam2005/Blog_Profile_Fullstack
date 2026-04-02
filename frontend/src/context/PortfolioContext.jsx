import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// eslint-disable-next-line react-refresh/only-export-components
export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/config`);
      setData(response.data);
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <PortfolioContext.Provider value={{ data, fetchConfig, loading }}>
      {children}
    </PortfolioContext.Provider>
  );
};
