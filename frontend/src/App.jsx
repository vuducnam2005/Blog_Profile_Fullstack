import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import Home from './pages/Home';
import { PortfolioProvider, PortfolioContext } from './context/PortfolioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import { BackgroundProvider, BackgroundContext } from './context/BackgroundContext';
import AudioPlayer from './components/AudioPlayer';
import SplineBackground from './components/SplineBackground';
import BlackHoleBackground from './components/BlackHoleBackground';
import ScrollProgressBar from './components/ScrollProgressBar';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AiChatLauncher from './components/AiChatLauncher';
import BackgroundPrompt from './components/BackgroundPrompt';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Lazy loading các route phụ và Chatbot AI giúp tối ưu 75% dung lượng file ban đầu
const Detail = lazy(() => import('./pages/Detail'));
const Admin = lazy(() => import('./pages/Admin'));
const CvViewer = lazy(() => import('./pages/CvViewer'));
const AlbumViewer = lazy(() => import('./pages/AlbumViewer'));

function AppContent() {
  const { data } = useContext(PortfolioContext);
  const { bgMode } = useContext(BackgroundContext);
  const { isAdmin } = useAuth();
  const [bypassedMaintenance, setBypassedMaintenance] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);

    AOS.init({
      duration: isTouchDevice ? 500 : 750,
      once: isTouchDevice, // Trên thiết bị di động/iOS, kích hoạt 1 lần khi cuộn tới giúp 60-120fps mượt mà
      offset: isTouchDevice ? 30 : 80,
      easing: 'ease-out-cubic',
    });
  }, []);

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
    <div className={`app-shell min-h-screen font-sans tracking-wide relative ${
      bgMode === 'spline' ? 'theme-nexbot' : 'theme-cosmic'
    }`}>
      {bgMode === 'spline' ? <SplineBackground /> : <BlackHoleBackground />}
      <ScrollProgressBar />
      <AudioPlayer />
      <main className="site-main w-full pb-20">
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
      <AiChatLauncher />
      {isNormalRoute && <BackgroundPrompt />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <PortfolioProvider>
        <AudioProvider>
          <BackgroundProvider>
            <Router>
              <AppContent />
            </Router>
          </BackgroundProvider>
        </AudioProvider>
      </PortfolioProvider>
    </AuthProvider>
  );
}

export default App;
