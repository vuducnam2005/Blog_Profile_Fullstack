import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import defaultData from '../data/defaultData.json';

// eslint-disable-next-line react-refresh/only-export-components
export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('portfolioData');
    return saved ? JSON.parse(saved) : defaultData;
  });
  const [loading, setLoading] = useState(!data);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/config?t=${new Date().getTime()}`);
      setData(response.data);
      localStorage.setItem('portfolioData', JSON.stringify(response.data));
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
    <PortfolioContext.Provider value={{ data, setData, fetchConfig, loading }}>
      {children}
    </PortfolioContext.Provider>
  );
};
