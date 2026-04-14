import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Admin from './pages/Admin';
import CvViewer from './pages/CvViewer';
import AlbumViewer from './pages/AlbumViewer';
import { PortfolioProvider, PortfolioContext } from './context/PortfolioContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AudioProvider } from './context/AudioContext';
import AudioPlayer from './components/AudioPlayer';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AOS from 'aos';
import 'aos/dist/aos.css';

function AppContent() {
  const { data } = useContext(PortfolioContext);
  const { isAdmin } = useAuth();
  const [bypassedMaintenance, setBypassedMaintenance] = useState(false);
  const location = useLocation();

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
    });
  }, []);

  const isNormalRoute = !location.pathname.startsWith('/admin');
  
  let isMaintenance = false;
  if (data?.maintenanceMode) {
    if (isNormalRoute) {
      // Mọi người (kể cả Admin) khi ra các trang ngoài đều thấy màn hình bảo trì để kiểm tra
      isMaintenance = true;
    } else {
      // Đang truy cập route /admin
      if (!isAdmin && !bypassedMaintenance) {
        // Nếu người lạ gõ thẳng /admin mà chưa bypass 3 clicks -> Chặn hiển thị Login form
        isMaintenance = true;
      }
    }
  }

  if (isMaintenance) {
    return <MaintenanceOverlay onBypass={() => setBypassedMaintenance(true)} />;
  }

  return (
    <div className="min-h-screen font-sans tracking-wide">
      <AudioPlayer />
      <main className="w-full pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<Detail />} />
          <Route path="/cv" element={<CvViewer />} />
          <Route path="/album" element={<AlbumViewer />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/create" element={<Admin />} />
          <Route path="/admin/edit/:id" element={<Admin />} />
        </Routes>
      </main>
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
