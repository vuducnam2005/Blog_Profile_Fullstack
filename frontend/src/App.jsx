import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import Home from './pages/Home';
import { PortfolioProvider, PortfolioContext } from './context/PortfolioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import AudioPlayer from './components/AudioPlayer';
import ScrollProgressBar from './components/ScrollProgressBar';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Lazy loading các route phụ và Chatbot AI giúp tối ưu 75% dung lượng file ban đầu
const Detail = lazy(() => import('./pages/Detail'));
const Admin = lazy(() => import('./pages/Admin'));
const CvViewer = lazy(() => import('./pages/CvViewer'));
const AlbumViewer = lazy(() => import('./pages/AlbumViewer'));
const AiChatWidget = lazy(() => import('./components/AiChatWidget'));

function AppContent() {
  const { data, configReady } = useContext(PortfolioContext);
  const { isAdmin } = useAuth();
  const [bypassedMaintenance, setBypassedMaintenance] = useState(false);
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
    });
  }, []);

  // CHỜ cho đến khi API trả về dữ liệu thật từ server
  if (!configReady) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid rgba(241,216,158,0.3)',
          borderTopColor: '#F1D89E', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isNormalRoute = !location.pathname.startsWith('/admin');
  
  let isMaintenance = false;
  if (data?.maintenanceMode) {
    if (isNormalRoute) {
      isMaintenance = true;
    } else {
      if (!isAdmin && !bypassedMaintenance) {
        isMaintenance = true;
      }
    }
  }

  if (isMaintenance) {
    return <MaintenanceOverlay onBypass={() => setBypassedMaintenance(true)} />;
  }

  return (
    <div className="min-h-screen font-sans tracking-wide">
      <ScrollProgressBar />
      <AudioPlayer />
      <main className="w-full pb-20">
        <Suspense fallback={<div className="min-h-[50vh]" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/post/:id" element={<Detail />} />
            <Route path="/cv" element={<CvViewer />} />
            <Route path="/album" element={<AlbumViewer />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/create" element={<Admin />} />
            <Route path="/admin/edit/:id" element={<Admin />} />
          </Routes>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <AudioProvider>
          <Router>
            <AppContent />
          </Router>
        </AudioProvider>
      </PortfolioProvider>
    </AuthProvider>
  );
}

export default App;
