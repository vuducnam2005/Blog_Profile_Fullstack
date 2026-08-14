import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, FileText, Globe, Menu, X, Camera, Volume2, VolumeX, Bot, Sparkles, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AudioContext } from '../context/AudioContext';
import { BackgroundContext } from '../context/BackgroundContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isPlaying, toggleAudio, audioUrl } = useContext(AudioContext);
  const { bgMode, toggleBgMode } = useContext(BackgroundContext);
  const { isAdmin, login } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    try {
      localStorage.setItem('appLang', newLang);
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  };

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    
    // Gửi sự kiện resetGalaxy cho MỌI tab để quay góc nhìn về như cũ
    window.dispatchEvent(new Event('resetGalaxy'));
  };

  useEffect(() => {
    if (clickCount > 0 && clickCount < 3) {
      const timer = setTimeout(() => setClickCount(0), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [clickCount]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogoClick = () => {
    scrollTo('hero');
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        if (isAdmin) {
          navigate('/admin/create');
        } else {
          setShowLoginModal(true);
        }
      }
      return next;
    });
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (username === "0362183511" && password === "Vuducnam2005@") {
      login();
      setAuthError(false);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
      navigate('/admin/create');
    } else {
      setAuthError(true);
    }
  };

  const navItems = [
    { id: 'hero', label: t('nav.home') },
    { id: 'about', label: t('nav.about') },
    { id: 'experience', label: t('nav.experience') },
    { id: 'projects', label: t('nav.projects') },
    { id: 'blog', label: t('nav.blog') },
    { id: 'contact', label: t('nav.contact') },
  ];

  return (
    <nav className="site-navbar fixed top-0 w-full z-50">
      {/* ===== TOP BAR ===== */}
      <div className="navbar-surface pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 px-3 md:px-6 xl:px-8 md:py-3.5 flex justify-between items-center bg-black/75 md:bg-black/60 backdrop-blur-xl md:backdrop-blur-md border-b border-[#F1D89E]/20 shadow-[0_8px_28px_rgba(0,0,0,0.22)] md:shadow-none">
        {/* Logo */}
        <div
          onClick={handleLogoClick}
          className="text-lg md:text-xl xl:text-2xl font-bold tracking-widest text-[#F1D89E] cursor-pointer hover:scale-105 transition-transform select-none shrink-0"
        >
          Vũ Đức Nam
        </div>

        {/* ===== DESKTOP NAV ===== */}
        <div className="hidden md:flex items-center gap-3 lg:gap-5 xl:gap-6 text-xs lg:text-sm font-semibold text-gray-300">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="hover:text-[#F1D89E] transition-colors uppercase whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}

          <div className="flex items-center gap-1.5 lg:gap-2.5 ml-1 lg:ml-3 whitespace-nowrap shrink-0">
            {audioUrl && (
              <button
                onClick={toggleAudio}
                className="flex items-center justify-center border border-[#F1D89E]/40 text-[#F1D89E] w-7 h-7 lg:w-8 lg:h-8 rounded-full hover:bg-[#F1D89E]/10 transition-colors shadow-sm shrink-0"
                title={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}
              >
                {isPlaying ? <Volume2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-pulse text-[#00D0C8]"/> : <VolumeX className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gray-400"/>}
              </button>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 border border-[#F1D89E]/40 text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs shrink-0"
            >
              <Globe className="w-3.5 h-3.5" /> {i18n.language === 'vi' ? 'EN' : 'VI'}
            </button>
            <button
              onClick={toggleBgMode}
              className="flex items-center gap-1.5 border border-[#F1D89E]/40 text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs select-none shrink-0"
              title={bgMode === 'spline' ? 'Đổi sang nền 3D Hố Đen' : 'Đổi sang nền 3D Nexbot'}
            >
              {bgMode === 'spline' ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-[#00D0C8]" /> <span>Nexbot</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#F1D89E]" /> <span>3D</span>
                </>
              )}
            </button>
            <Link
              to="/album"
              className="flex items-center gap-1 border border-[#F1D89E] text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors text-xs font-bold shrink-0"
            >
              <Camera className="w-3.5 h-3.5" /> Album
            </Link>
            <Link
              to="/cv"
              className="flex items-center gap-1 border border-[#F1D89E] text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors text-xs font-bold shrink-0"
            >
              <FileText className="w-3.5 h-3.5" /> CV
            </Link>
            {isAdmin && (
              <Link
                to="/admin/create"
                className="border border-[#F1D89E]/40 text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E]/10 transition-colors flex items-center gap-1 text-xs font-bold shrink-0 animate-pulse"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" /> Admin
              </Link>
            )}
          </div>
        </div>

        {/* ===== MOBILE HAMBURGER BUTTON ===== */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-[#F1D89E] p-2 rounded-lg hover:bg-[#F1D89E]/10 transition-colors"
          aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ===== MOBILE DROPDOWN MENU ===== */}
      <div
        id="mobile-navigation"
        className={`mobile-nav-menu md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-[calc(100dvh-64px)] opacity-100' : 'max-h-0 opacity-0'
          }`}
      >
        <div className="navbar-mobile-surface bg-black/80 backdrop-blur-xl border-b border-[#F1D89E]/20 px-6 py-4 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-left text-gray-300 hover:text-[#F1D89E] hover:bg-[#F1D89E]/5 px-4 py-3 rounded-xl transition-all uppercase text-sm font-semibold tracking-wider"
            >
              {item.label}
            </button>
          ))}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#F1D89E]/30 to-transparent my-2"></div>

          <div className="flex flex-wrap gap-3 px-4 py-2">
            {audioUrl && (
              <button
                onClick={toggleAudio}
                className="flex items-center gap-2 border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs"
              >
                {isPlaying ? <Volume2 className="w-4 h-4 text-[#00D0C8] animate-pulse"/> : <VolumeX className="w-4 h-4 text-gray-400"/>}
                {isPlaying ? "TẮT NHẠC" : "BẬT NHẠC"}
              </button>
            )}
            <button
              onClick={() => { toggleLanguage(); setMobileOpen(false); }}
              className="flex items-center gap-2 border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs"
            >
              <Globe className="w-4 h-4" /> {i18n.language === 'vi' ? 'EN' : 'VI'}
            </button>
            <button
              onClick={() => { toggleBgMode(); setMobileOpen(false); }}
              className="flex items-center gap-2 border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs"
            >
              {bgMode === 'spline' ? <Bot className="w-4 h-4 text-[#00D0C8]"/> : <Sparkles className="w-4 h-4 text-[#F1D89E]"/>}
              {bgMode === 'spline' ? 'NỀN 3D NEXBOT' : 'NỀN 3D HỐ ĐEN'}
            </button>
            <Link
              to="/album"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 border border-[#F1D89E] text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors text-xs font-bold"
            >
              <Camera className="w-4 h-4" /> Album
            </Link>
            <Link
              to="/cv"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 border border-[#F1D89E] text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors text-xs font-bold"
            >
              <FileText className="w-4 h-4" /> CV
            </Link>
            {isAdmin && (
              <Link
                to="/admin/create"
                onClick={() => setMobileOpen(false)}
                className="border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-2 rounded-full hover:bg-[#F1D89E]/10 transition-colors flex items-center gap-2 text-xs font-bold"
              >
                <User className="w-4 h-4" /> Admin
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ===== MODAL ĐĂNG NHẬP ADMIN BẢO MẬT ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full glass rounded-3xl p-8 bg-[#0c0d12]/95 border border-[#F1D89E]/30 shadow-[0_12px_40px_rgba(0,0,0,0.9)] relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="p-3 bg-[#F1D89E]/10 rounded-2xl border border-[#F1D89E]/20 mb-3">
                <Lock className="w-7 h-7 text-[#F1D89E]" />
              </div>
              <h2 className="text-xl font-bold text-center text-white tracking-wide">
                Xác Thực Quản Trị Hệ Thống
              </h2>
              <p className="text-xs text-gray-400 mt-1">Vui lòng nhập tài khoản quản trị viên</p>
            </div>

            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#F1D89E] mb-1.5 uppercase tracking-wider">Tài khoản (SĐT)</label>
                <input 
                  type="text" 
                  required 
                  autoComplete="off"
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                  placeholder="Nhập SĐT quản trị..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F1D89E] mb-1.5 uppercase tracking-wider">Mật khẩu</label>
                <input 
                  type="password" 
                  required 
                  autoComplete="new-password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                  placeholder="Nhập mật khẩu..."
                />
              </div>

              {authError && (
                <p className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2 rounded-lg">
                  Tài khoản hoặc mật khẩu không chính xác!
                </p>
              )}

              <button 
                type="submit" 
                className="mt-2 bg-[#F1D89E] text-black font-bold text-sm py-3 rounded-xl hover:bg-white transition-all uppercase tracking-widest shadow-md"
              >
                ĐĂNG NHẬP QUẢN TRỊ
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
