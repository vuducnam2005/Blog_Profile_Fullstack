import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import defaultData from '../data/defaultData.json';

const CONFIG_CACHE_KEY = 'portfolioData';
const CONFIG_ETAG_KEY = 'portfolioConfigEtag';
const CONFIG_REVALIDATE_MS = 15_000;
const CONFIG_POLL_INTERVAL_MS = 60_000;

function readCachedConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_CACHE_KEY);
    return saved ? JSON.parse(saved) : defaultData;
  } catch (error) {
    console.warn('Không thể đọc config cache, sử dụng dữ liệu mặc định:', error);
    try {
      localStorage.removeItem(CONFIG_CACHE_KEY);
    } catch {
      // Storage có thể bị chặn trong chế độ riêng tư hoặc policy của trình duyệt.
    }
    return defaultData;
  }
}

function readCachedEtag() {
  try {
    return localStorage.getItem(CONFIG_ETAG_KEY) || '';
  } catch {
    return '';
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export const PortfolioContext = createContext();

export const PortfolioProvider = ({ children }) => {
  const [data, setDataState] = useState(readCachedConfig);
  const [refreshing, setRefreshing] = useState(false);
  const dataRef = useRef(data);
  const lastJsonRef = useRef(JSON.stringify(data));
  const etagRef = useRef(readCachedEtag());
  const lastFetchedAtRef = useRef(0);
  const activeRequestRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const setData = useCallback((value) => {
    setDataState((currentData) => {
      const nextData = typeof value === 'function' ? value(currentData) : value;
      if (!nextData) return currentData;

      const nextJson = JSON.stringify(nextData);
      lastJsonRef.current = nextJson;
      dataRef.current = nextData;

      try {
        localStorage.setItem(CONFIG_CACHE_KEY, nextJson);
      } catch (error) {
        console.warn('Không thể lưu config cache:', error);
      }

      return nextData;
    });
  }, []);

  const fetchConfig = useCallback((options = {}) => {
    const { force = false } = options;
    const now = Date.now();

    if (activeRequestRef.current) {
      return activeRequestRef.current.promise;
    }

    if (!force && now - lastFetchedAtRef.current < CONFIG_REVALIDATE_MS) {
      return Promise.resolve(dataRef.current);
    }

    const controller = new AbortController();
    const headers = etagRef.current
      ? { 'If-None-Match': etagRef.current }
      : undefined;

    if (mountedRef.current) {
      setRefreshing(true);
    }

    const promise = axios.get(`${API_BASE_URL}/api/config`, {
      signal: controller.signal,
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    }).then((response) => {
      lastFetchedAtRef.current = Date.now();

      if (response.status === 304) {
        return dataRef.current;
      }

      const newJson = JSON.stringify(response.data);
      if (newJson !== lastJsonRef.current) {
        setData(response.data);
      }

      const nextEtag = response.headers.etag;
      if (nextEtag) {
        etagRef.current = nextEtag;
        try {
          localStorage.setItem(CONFIG_ETAG_KEY, nextEtag);
        } catch (error) {
          console.warn('Không thể lưu config ETag:', error);
        }
      }

      return response.data;
    }).catch((error) => {
      if (error.code !== 'ERR_CANCELED') {
        console.error('Error fetching config:', error);
      }
      return dataRef.current;
    }).finally(() => {
      if (activeRequestRef.current?.promise === promise) {
        activeRequestRef.current = null;
        if (mountedRef.current) {
          setRefreshing(false);
        }
      }
    });

    activeRequestRef.current = { promise, controller };
    return promise;
  }, [setData]);

  useEffect(() => {
    mountedRef.current = true;
    const initialRefresh = window.setTimeout(() => {
      fetchConfig({ force: true });
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialRefresh);
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    };
  }, [fetchConfig]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConfig();
      }
    }, CONFIG_POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchConfig();
      }
    };

    const handleOnline = () => fetchConfig({ force: true });

    const handleStorage = (event) => {
      if (event.key === CONFIG_CACHE_KEY && event.newValue) {
        try {
          const nextData = JSON.parse(event.newValue);
          const nextJson = JSON.stringify(nextData);
          lastJsonRef.current = nextJson;
          dataRef.current = nextData;
          setDataState(nextData);
        } catch (error) {
          console.warn('Bỏ qua config cache không hợp lệ từ tab khác:', error);
        }
      }

      if (event.key === CONFIG_ETAG_KEY) {
        etagRef.current = event.newValue || '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchConfig]);

  return (
    <PortfolioContext.Provider value={{
      data,
      setData,
      fetchConfig,
      loading: !data,
      refreshing,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};
