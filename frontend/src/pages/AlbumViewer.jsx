import { useState, useContext, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, X, ChevronLeft, ChevronRight, Play, Image as ImageIcon, Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import { AudioContext } from '../context/AudioContext';
import { API_BASE_URL } from '../config';

export default function AlbumViewer() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const [filter, setFilter] = useState('all');
  const [albums, setAlbums] = useState([]);
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const { pauseAudioThmporarily, resumeAudioAfterTempPause } = useContext(AudioContext);

  useEffect(() => {
    if (data?.album) {
      setAlbums(data.album);
    }
  }, [data]);

  const filteredAlbums = albums.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const resolveUrl = (item, isThumbnail = false) => {
    let url = item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`;

    // Tối ưu hóa qua Cloudinary nếu đang sử dụng
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        let transformation = isThumbnail 
          ? 'c_fill,g_auto,h_600,w_600,f_auto,q_auto' 
          : 'f_auto,q_auto';
        
        if (isThumbnail && item.type === 'video') {
          // Đối với video, lấy frame ở giây thứ 0.5 làm ảnh thumbnail tĩnh
          transformation += ',so_0.5';
          const thumbUrl = parts[0] + '/upload/' + transformation + '/' + parts[1];
          return thumbUrl.replace(/\.[^/.]+$/, '.jpg');
        }
        
        if (item.type === 'video') {
          // Luôn ép đuôi .mp4 cho video full size để tương thích tốt nhất
          return (parts[0] + '/upload/' + transformation + '/' + parts[1]).replace(/\.[^/.]+$/, '.mp4');
        }
        
        return parts[0] + '/upload/' + transformation + '/' + parts[1];
      }
    }

    return url;
  };

  // Lightbox navigation
  const openLightbox = (index) => {
    setLightbox({ open: true, index });
    // Nếu mở 1 video, có thể pause nhạc ngay, hoặc đợi nó tự play. Tốt nhất để video controls onPlay.
  };
  const closeLightbox = () => {
    setLightbox({ open: false, index: 0 });
    resumeAudioAfterTempPause();
  };

  const goNext = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index + 1) % filteredAlbums.length,
    }));
  }, [filteredAlbums.length]);

  const goPrev = useCallback(() => {
    setLightbox((prev) => ({
      ...prev,
      index: (prev.index - 1 + filteredAlbums.length) % filteredAlbums.length,
    }));
  }, [filteredAlbums.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox.open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox.open, goNext, goPrev]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightbox.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightbox.open]);

  const currentItem = lightbox.open ? filteredAlbums[lightbox.index] : null;

  const imageCount = albums.filter(i => i.type === 'image').length;
  const videoCount = albums.filter(i => i.type === 'video').length;

  return (
    <>
      {/* ====== CSS Animations ====== */}
      <style>{`
        @keyframes albumFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lightboxIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .album-item {
          animation: albumFadeIn 0.5s ease-out both;
        }
        .album-item:nth-child(2) { animation-delay: 0.05s; }
        .album-item:nth-child(3) { animation-delay: 0.1s; }
        .album-item:nth-child(4) { animation-delay: 0.15s; }
        .album-item:nth-child(5) { animation-delay: 0.2s; }
        .album-item:nth-child(6) { animation-delay: 0.25s; }
        .album-item:nth-child(7) { animation-delay: 0.3s; }
        .album-item:nth-child(8) { animation-delay: 0.35s; }
        .album-item:nth-child(9) { animation-delay: 0.4s; }
        .album-item:nth-child(10) { animation-delay: 0.45s; }
        .lightbox-content {
          animation: lightboxIn 0.3s ease-out;
        }
        .album-thumb {
          aspect-ratio: 1 / 1;
          object-fit: cover;
        }
        .album-thumb-video {
          aspect-ratio: 1 / 1;
          object-fit: cover;
        }
      `}</style>

      {/* ====== NAVBAR ====== */}
      <nav
        className="fixed top-0 w-full z-50 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center bg-black/60 backdrop-blur-xl border-b border-[#F1D89E]/20"
        style={{ pointerEvents: 'auto' }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 text-[#F1D89E] hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs md:text-sm font-semibold tracking-wide uppercase">{t('nav.back', 'Quay lại')}</span>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          <Camera className="w-4 h-4 md:w-5 md:h-5 text-[#F1D89E]" />
          <span className="text-white font-bold tracking-widest text-base md:text-lg hidden sm:inline">
            {t('album.title', 'Khoảnh Khắc Đáng Nhớ')}
          </span>
          <span className="text-white font-bold tracking-widest text-base sm:hidden">
            ALBUM
          </span>
        </div>

        {/* Counter badge */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-[#F1D89E]/70" /> {imageCount}
          </span>
          <span className="flex items-center gap-1">
            <Film className="w-3.5 h-3.5 text-[#F1D89E]/70" /> {videoCount}
          </span>
        </div>
      </nav>

      {/* ====== CONTENT ====== */}
      <div
        className="w-full relative z-10 min-h-screen"
        style={{ padding: '80px 16px 40px 16px' }}
      >
        <div className="max-w-6xl mx-auto">

          {/* ====== FILTER BUTTONS ====== */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { key: 'all', label: t('album.filter_all', 'Tất cả'), icon: null },
              { key: 'image', label: t('album.filter_images', 'Ảnh'), icon: <ImageIcon className="w-4 h-4" /> },
              { key: 'video', label: t('album.filter_videos', 'Video'), icon: <Film className="w-4 h-4" /> },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all duration-300 ${filter === btn.key
                    ? 'bg-[#F1D89E] text-black shadow-[0_0_20px_rgba(241,216,158,0.5)] scale-105'
                    : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#F1D89E]/50 hover:text-[#F1D89E]'
                  }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* ====== GRID ====== */}
          {filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-20 h-20 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center">
                <Camera className="w-10 h-10 text-[#F1D89E]/40" />
              </div>
              <p className="text-gray-400 text-lg">{t('album.empty', 'Chưa có hình ảnh hoặc video.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {filteredAlbums.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="album-item relative group rounded-xl overflow-hidden cursor-pointer bg-black/40 border border-white/10 hover:border-[#F1D89E]/40 transition-all duration-300 hover:shadow-[0_0_20px_rgba(241,216,158,0.15)]"
                    onClick={() => openLightbox(index)}
                  >
                    {item.type === 'video' ? (
                      <div className="relative">
                        <img
                          src={resolveUrl(item, true)}
                          alt={`Album video thumbnail ${index + 1}`}
                          loading="lazy"
                          className="w-full album-thumb-video rounded-xl"
                        />
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors rounded-xl">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#F1D89E]/90 flex items-center justify-center shadow-[0_0_15px_rgba(241,216,158,0.5)] group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 md:w-6 md:h-6 text-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={resolveUrl(item, true)}
                        alt={`Album ${index + 1}`}
                        loading="lazy"
                        className="w-full album-thumb rounded-xl group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    {/* Hover glow border */}
                    <div className="absolute inset-0 pointer-events-none rounded-xl border-2 border-transparent group-hover:border-[#F1D89E]/30 transition-colors duration-300"></div>

                    {/* Type badge */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.type === 'video' ? (
                        <Film className="w-3 h-3 text-[#F1D89E]" />
                      ) : (
                        <ImageIcon className="w-3 h-3 text-[#F1D89E]" />
                      )}
                      <span className="text-[10px] text-gray-300 font-medium uppercase">{item.type}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====== LIGHTBOX MODAL ====== */}
      {lightbox.open && currentItem && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all hover:scale-110"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 md:top-6 z-[110] text-gray-400 text-sm font-medium bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
            {lightbox.index + 1} / {filteredAlbums.length}
          </div>

          {/* Navigate prev */}
          {filteredAlbums.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-2 md:left-6 z-[110] text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 md:p-3 transition-all hover:scale-110"
            >
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Navigate next */}
          {filteredAlbums.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-2 md:right-6 z-[110] text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 md:p-3 transition-all hover:scale-110"
            >
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Media content */}
          <div
            className="lightbox-content max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {currentItem.type === 'video' ? (
              <video
                key={lightbox.index}
                src={resolveUrl(currentItem)}
                controls
                autoPlay
                playsInline
                onPlay={pauseAudioThmporarily}
                onPause={resumeAudioAfterTempPause}
                onEnded={resumeAudioAfterTempPause}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-[0_0_40px_rgba(241,216,158,0.2)]"
              />
            ) : (
              <img
                key={lightbox.index}
                src={resolveUrl(currentItem)}
                alt={`Album ${lightbox.index + 1}`}
                className="max-w-full max-h-[85vh] rounded-2xl shadow-[0_0_40px_rgba(241,216,158,0.2)] object-contain"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
