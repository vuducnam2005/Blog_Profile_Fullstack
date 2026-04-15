import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
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
  // configReady = false cho đến khi API trả về dữ liệu thật lần đầu tiên
  // Ngăn chặn việc dùng dữ liệu cũ từ localStorage để quyết định bảo trì
  const [configReady, setConfigReady] = useState(false);
  // Ref lưu JSON string hiện tại để so sánh, tránh re-render khi data không đổi
  const lastJsonRef = useRef('');

  const fetchConfig = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/config?t=${new Date().getTime()}`);
      const newJson = JSON.stringify(response.data);
      // Chỉ cập nhật state khi dữ liệu thực sự thay đổi → tránh re-render thừa
      if (newJson !== lastJsonRef.current) {
        lastJsonRef.current = newJson;
        setData(response.data);
        localStorage.setItem('portfolioData', newJson);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setLoading(false);
      setConfigReady(true);
    }
  }, []);

  // Lần đầu tiên fetch khi app mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ĐỒ NG BỘ XUYÊN TRÌNH DUYỆT:
  // Tự động polling server mỗi 10 giây + fetch ngay khi user chuyển qua tab này
  // Đảm bảo khi Admin thay đổi bảo trì ở trình duyệt khác, trang Home tự cập nhật
  useEffect(() => {
    // Polling mỗi 10 giây (chỉ khi tab đang hiển thị)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchConfig();
      }
    }, 10000);

    // Fetch ngay lập tức khi user chuyển qua tab/cửa sổ này
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchConfig();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchConfig]);

  return (
    <PortfolioContext.Provider value={{ data, setData, fetchConfig, loading, configReady }}>
      {children}
    </PortfolioContext.Provider>
  );
};
