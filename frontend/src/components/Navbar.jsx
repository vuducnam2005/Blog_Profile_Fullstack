import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, FileText, Globe, Menu, X, Camera, Music, Volume2, VolumeX, Video, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AudioContext } from '../context/AudioContext';
import { BackgroundContext } from '../context/BackgroundContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { isPlaying, toggleAudio, audioUrl } = useContext(AudioContext);
  const { bgMode, toggleBgMode } = useContext(BackgroundContext);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const [clickCount, setClickCount] = useState(0);
  const isAdminVisible = clickCount >= 3;

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
    setClickCount((prev) => prev + 1);
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
    <nav className="fixed top-0 w-full z-50">
      {/* ===== TOP BAR ===== */}
      <div className="pt-[max(0.6rem,env(safe-area-inset-top))] pb-2.5 px-3 md:px-6 xl:px-8 md:py-3.5 flex justify-between items-center bg-black/75 md:bg-black/60 backdrop-blur-xl md:backdrop-blur-md border-b border-[#F1D89E]/20 shadow-[0_8px_28px_rgba(0,0,0,0.22)] md:shadow-none">
        {/* Logo */}
        <div
          onClick={handleLogoClick}
          className="text-lg md:text-xl xl:text-2xl font-bold tracking-widest text-[#F1D89E] cursor-pointer hover:scale-105 transition-transform select-none shrink-0"
        >
          Vũ Đức Nam
        </div>

        {/* ===== DESKTOP NAV (md trở lên - Tối ưu 1 hàng không bị rớt dòng) ===== */}
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
              title={bgMode === 'video' ? 'Đổi sang nền 3D Hố Đen' : 'Đổi sang nền Video Vũ Trụ'}
            >
              {bgMode === 'video' ? (
                <>
                  <Video className="w-3.5 h-3.5 text-[#00D0C8]" /> <span>Video</span>
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
            {isAdminVisible && (
              <Link
                to="/admin/create"
                className="border border-[#F1D89E]/40 text-[#F1D89E] px-2.5 lg:px-3 py-1 rounded-full hover:bg-[#F1D89E]/10 transition-colors flex items-center gap-1 text-xs font-bold shrink-0"
              >
                <User className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
          </div>
        </div>

        {/* ===== MOBILE HAMBURGER BUTTON (chỉ hiện trên mobile) ===== */}
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
        <div className="bg-black/80 backdrop-blur-xl border-b border-[#F1D89E]/20 px-6 py-4 flex flex-col gap-1">
          {/* Các tab điều hướng */}
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-left text-gray-300 hover:text-[#F1D89E] hover:bg-[#F1D89E]/5 px-4 py-3 rounded-xl transition-all uppercase text-sm font-semibold tracking-wider"
            >
              {item.label}
            </button>
          ))}

          {/* Đường phân cách */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#F1D89E]/30 to-transparent my-2"></div>

          {/* Nút chức năng */}
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
              {bgMode === 'video' ? <Video className="w-4 h-4 text-[#00D0C8]"/> : <Sparkles className="w-4 h-4 text-[#F1D89E]"/>}
              {bgMode === 'video' ? 'NỀN VIDEO' : 'NỀN 3D HỐ ĐEN'}
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
            {isAdminVisible && (
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
    </nav>
  );
}
