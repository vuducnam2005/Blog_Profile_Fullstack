import { useState, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, FileText, Globe, Menu, X, Camera, Music, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AudioContext } from '../context/AudioContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { isPlaying, toggleAudio, audioUrl } = useContext(AudioContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('appLang', newLang);
  };

  const scrollTo = (id) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const [clickCount, setClickCount] = useState(0);
  const [isAdminVisible, setIsAdminVisible] = useState(false);

  useEffect(() => {
    if (clickCount > 0 && clickCount < 3) {
      const timer = setTimeout(() => setClickCount(0), 1000);
      return () => clearTimeout(timer);
    }
    if (clickCount >= 3) {
      setIsAdminVisible(true);
    }
  }, [clickCount]);

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
      <div className="px-4 md:px-8 py-4 md:py-5 flex justify-between items-center bg-black/50 backdrop-blur-md border-b border-[#F1D89E]/20">
        {/* Logo */}
        <div
          onClick={handleLogoClick}
          className="text-xl md:text-2xl font-bold tracking-widest text-[#F1D89E] cursor-pointer hover:scale-105 transition-transform select-none"
        >
          Vũ Đức Nam
        </div>

        {/* ===== DESKTOP NAV (md trở lên - giữ nguyên) ===== */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="hover:text-[#F1D89E] transition-colors uppercase"
            >
              {item.label}
            </button>
          ))}

          <div className="flex gap-4 ml-4">
            {audioUrl && (
              <button
                onClick={toggleAudio}
                className="flex items-center justify-center border border-[#F1D89E]/40 text-[#F1D89E] w-8 h-8 rounded-full hover:bg-[#F1D89E]/10 transition-colors shadow-sm"
                title={isPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}
              >
                {isPlaying ? <Volume2 className="w-4 h-4 animate-pulse text-[#00D0C8]"/> : <VolumeX className="w-4 h-4 text-gray-400"/>}
              </button>
            )}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-1.5 rounded-full hover:bg-[#F1D89E]/10 transition-colors font-bold text-xs"
            >
              <Globe className="w-4 h-4" /> {i18n.language === 'vi' ? 'EN' : 'VI'}
            </button>
            <Link
              to="/album"
              className="flex items-center gap-2 border border-[#F1D89E] text-[#F1D89E] px-4 py-1.5 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors"
            >
              <Camera className="w-4 h-4" /> Album
            </Link>
            <Link
              to="/cv"
              className="flex items-center gap-2 border border-[#F1D89E] text-[#F1D89E] px-4 py-1.5 rounded-full hover:bg-[#F1D89E] hover:text-black transition-colors"
            >
              <FileText className="w-4 h-4" /> CV
            </Link>
            {isAdminVisible && (
              <Link
                to="/admin/create"
                className="border border-[#F1D89E]/40 text-[#F1D89E] px-4 py-1.5 rounded-full hover:bg-[#F1D89E]/10 transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Admin
              </Link>
            )}
          </div>
        </div>

        {/* ===== MOBILE HAMBURGER BUTTON (chỉ hiện trên mobile) ===== */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-[#F1D89E] p-2 rounded-lg hover:bg-[#F1D89E]/10 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ===== MOBILE DROPDOWN MENU ===== */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
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
