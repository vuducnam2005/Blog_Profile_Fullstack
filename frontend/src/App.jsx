import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Admin from './pages/Admin';
import CvViewer from './pages/CvViewer';
import AlbumViewer from './pages/AlbumViewer';
import { PortfolioProvider } from './context/PortfolioContext';
import { AuthProvider } from './context/AuthContext';
import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: false,
    });
  }, []);

  return (
    <AuthProvider>
    <PortfolioProvider>
      <Router>
      <div className="min-h-screen font-sans tracking-wide">
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
      </Router>
    </PortfolioProvider>
    </AuthProvider>
  );
}

export default App;
