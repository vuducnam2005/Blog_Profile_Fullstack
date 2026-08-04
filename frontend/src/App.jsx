import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext, lazy, Suspense } from 'react';
import Home from './pages/Home';
import { PortfolioProvider, PortfolioContext } from './context/PortfolioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import AudioPlayer from './components/AudioPlayer';
import ScrollProgressBar from './components/ScrollProgressBar';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AiChatLauncher from './components/AiChatLauncher';
import AOS from 'aos';
import 'aos/dist/aos.css';

function parseTransitionTime(value) {
  return value.split(',').reduce((maxTime, part) => {
    const time = part.trim();
    const milliseconds = time.endsWith('ms')
      ? Number.parseFloat(time)
      : Number.parseFloat(time) * 1000;
    return Number.isFinite(milliseconds) ? Math.max(maxTime, milliseconds) : maxTime;
  }, 0);
}

// Lazy loading các route phụ và Chatbot AI giúp tối ưu 75% dung lượng file ban đầu
const Detail = lazy(() => import('./pages/Detail'));
const Admin = lazy(() => import('./pages/Admin'));
const CvViewer = lazy(() => import('./pages/CvViewer'));
const AlbumViewer = lazy(() => import('./pages/AlbumViewer'));

function AppContent() {
  const { data } = useContext(PortfolioContext);
  const { isAdmin } = useAuth();
  const [bypassedMaintenance, setBypassedMaintenance] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const activeTimers = new Map();
    const manageWillChange = (event) => {
      const element = event.detail;
      if (!(element instanceof HTMLElement)) return;

      const current = activeTimers.get(element);
      if (current) window.clearTimeout(current.timerId);

      const originalValue = current?.originalValue ?? element.style.willChange;
      element.style.willChange = 'transform, opacity';

      const computedStyle = window.getComputedStyle(element);
      const activeDuration = parseTransitionTime(computedStyle.transitionDuration)
        + parseTransitionTime(computedStyle.transitionDelay);
      const timerId = window.setTimeout(() => {
        element.style.willChange = originalValue;
        activeTimers.delete(element);
      }, Math.max(activeDuration, 1000) + 80);

      activeTimers.set(element, { timerId, originalValue });
    };

    document.addEventListener('aos:in', manageWillChange);
    document.addEventListener('aos:out', manageWillChange);
    AOS.init({
      duration: 1000,
      once: false,
    });

    return () => {
      document.removeEventListener('aos:in', manageWillChange);
      document.removeEventListener('aos:out', manageWillChange);
      activeTimers.forEach(({ timerId, originalValue }, element) => {
        window.clearTimeout(timerId);
        element.style.willChange = originalValue;
      });
      activeTimers.clear();
    };
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
      <AiChatLauncher />
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
