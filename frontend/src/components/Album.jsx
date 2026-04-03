import { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PortfolioContext } from '../context/PortfolioContext';
import { API_BASE_URL } from '../config';

export default function Album() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const [filter, setFilter] = useState('all'); // 'all', 'image', 'video'
  const [albums, setAlbums] = useState([]);

  useEffect(() => {
    if (data?.album) {
      setAlbums(data.album);
    }
  }, [data]);

  const filteredAlbums = albums.filter((item) => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  // Removed early return to ensure the #album section always renders
  return (
    <section id="album" className="min-h-screen pt-20 pb-16 px-4 md:px-12 lg:px-24">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center">
          <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span>
          {t('album.title', 'Khoảnh Khắc Đáng Nhớ (Album)')}
        </h2>

        {/* BỘ LỌC */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'all' ? 'bg-[#F1D89E] text-black shadow-[0_0_15px_rgba(241,216,158,0.5)]' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#F1D89E]/50'}`}
          >
            {t('album.filter_all', 'Tất cả')}
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'image' ? 'bg-[#F1D89E] text-black shadow-[0_0_15px_rgba(241,216,158,0.5)]' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#F1D89E]/50'}`}
          >
            {t('album.filter_images', 'Ảnh')}
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-6 py-2 rounded-full font-bold transition-all ${filter === 'video' ? 'bg-[#F1D89E] text-black shadow-[0_0_15px_rgba(241,216,158,0.5)]' : 'bg-white/5 text-gray-400 border border-white/10 hover:border-[#F1D89E]/50'}`}
          >
            {t('album.filter_videos', 'Video')}
          </button>
        </div>

        {/* LƯỚI ẢNH / VIDEO */}
        {filteredAlbums.length === 0 ? (
          <p className="text-center text-gray-400 text-lg">{t('album.empty', 'Chưa có hình ảnh hoặc video.')}</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredAlbums.map((item, index) => {
              let url = item.url.startsWith('http') ? item.url : `${API_BASE_URL}${item.url}`;
              
              // Nếu dùng Cloudinary, ép định dạng đuôi thành .mp4 để mọi trình duyệt (Chrome, Cốc Cốc...) đều đọc được kể cả video tải lên từ iPhone (.mov)
              if (item.type === 'video' && url.includes('cloudinary.com')) {
                  url = url.replace(/\.[^/.]+$/, ".mp4");
              }
              
              return (
                <div key={index} className="break-inside-avoid relative group rounded-2xl overflow-hidden glass border border-white/10 bg-black/40 shadow-xl">
                  {item.type === 'video' ? (
                    <video
                      src={url}
                      controls
                      playsInline
                      preload="metadata"
                      className="relative z-10 w-full object-cover transition-transform duration-500 rounded-2xl"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`Album item ${index}`}
                      loading="lazy"
                      className="w-full object-cover rounded-2xl transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  {/* Glow layer khi hover */}
                  <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-[#F1D89E]/30 rounded-2xl transition-colors duration-300"></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
