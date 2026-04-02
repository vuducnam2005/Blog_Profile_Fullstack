import { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Loader2, ExternalLink } from 'lucide-react';
import { PortfolioContext } from '../context/PortfolioContext';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

export default function CvViewer() {
  const { t } = useTranslation();
  const { data, loading } = useContext(PortfolioContext);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const hero = data?.hero || {};
  const cvUrl = hero.cvUrl
    ? (hero.cvUrl.startsWith('http') ? hero.cvUrl : `${API_BASE_URL}${hero.cvUrl}`)
    : null;

  return (
    <>
      {/* ====== NAVBAR CỦA TRANG CV ====== */}
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
          <FileText className="w-4 h-4 md:w-5 md:h-5 text-[#F1D89E]" />
          <span className="text-white font-bold tracking-widest text-base md:text-lg hidden sm:inline">
            CURRICULUM VITAE
          </span>
          <span className="text-white font-bold tracking-widest text-base sm:hidden">
            CV
          </span>
        </div>

        {cvUrl && (
          <a
            href={cvUrl}
            download
            className="flex items-center gap-1 md:gap-2 border border-[#F1D89E]/50 text-[#F1D89E] px-3 md:px-4 py-1.5 rounded-full hover:bg-[#F1D89E] hover:text-black transition-all text-xs md:text-sm font-semibold hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('nav.download', 'Tải về')}</span>
          </a>
        )}
      </nav>

      {/* ====== NỘI DUNG ====== */}
      <div
        className="w-full relative z-10"
        style={{
          pointerEvents: 'auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isMobile ? '60px 12px 24px 12px' : '72px 24px 24px 24px',
        }}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ minHeight: 'calc(100vh - 96px)' }}>
            <Loader2 className="w-10 h-10 text-[#F1D89E] animate-spin" />
            <p className="text-gray-400 text-sm tracking-wide">{t('cv.loading', 'Đang tải CV...')}</p>
          </div>
        ) : !cvUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ minHeight: 'calc(100vh - 96px)' }}>
            <div className="w-24 h-24 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center">
              <FileText className="w-12 h-12 text-[#F1D89E]/50" />
            </div>
            <h2 className="text-white text-2xl font-bold tracking-wide">{t('cv.emptyTitle', 'Chưa có CV')}</h2>
            <p className="text-gray-400 text-center max-w-md">
              {t('cv.emptyDesc', 'CV chưa được tải lên. Vui lòng quay lại sau khi admin đã cập nhật CV mới.')}
            </p>
            <Link
              to="/"
              className="mt-4 bg-[#F1D89E] text-black font-bold px-8 py-3 rounded-full hover:bg-white transition-all hover:scale-105 shadow-[0_0_15px_rgba(241,216,158,0.4)]"
            >
              {t('cv.homeBtn', 'Về trang chủ')}
            </Link>
          </div>
        ) : isMobile ? (
          /* =============== MOBILE: Hiển thị nút thao tác thay vì iframe =============== */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full" style={{ minHeight: 'calc(100vh - 80px)' }}>
            {/* Icon lớn */}
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-[#F1D89E]/20 to-orange-500/10 border border-[#F1D89E]/30 flex items-center justify-center shadow-[0_0_40px_rgba(241,216,158,0.2)]">
              <FileText className="w-14 h-14 text-[#F1D89E]" />
            </div>

            <div className="text-center">
              <h2 className="text-white text-2xl font-bold tracking-wide mb-2">
                {hero.name || "Vũ Đức Nam"}
              </h2>
              <p className="text-[#F1D89E] text-sm font-semibold tracking-widest uppercase">
                Curriculum Vitae
              </p>
            </div>

            <p className="text-gray-400 text-center text-sm max-w-xs leading-relaxed">
              {t('cv.mobileDesc', 'Nhấn nút bên dưới để xem hoặc tải CV về thiết bị của bạn.')}
            </p>

            {/* Nút mở CV trong tab mới */}
            <a
              href={cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#F1D89E] text-black font-bold px-8 py-4 rounded-full shadow-[0_0_20px_rgba(241,216,158,0.4)] hover:bg-white transition-all hover:scale-105 text-base"
            >
              <ExternalLink className="w-5 h-5" />
              {t('cv.openCV', 'Mở CV')}
            </a>

            {/* Nút tải về */}
            <a
              href={cvUrl}
              download
              className="flex items-center gap-3 border-2 border-[#F1D89E]/50 text-[#F1D89E] font-semibold px-8 py-3.5 rounded-full hover:bg-[#F1D89E]/10 transition-all hover:scale-105 text-sm"
            >
              <Download className="w-5 h-5" />
              {t('cv.downloadCV', 'Tải CV về máy')}
            </a>

            {/* Đường trang trí */}
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#F1D89E]/40 to-transparent mt-4"></div>
            <p className="text-gray-600 text-xs">PDF • A4</p>
          </div>
        ) : (
          /* =============== DESKTOP: Giữ nguyên fire-frame iframe =============== */
          <>
            {/* CSS cho hiệu ứng lửa cháy viền */}
            <style>{`
              @keyframes emberGlow1 {
                0%   { box-shadow: 0 0 8px 2px #ff4500, 0 0 20px 4px rgba(255,100,0,0.5), 0 0 40px 8px rgba(255,60,0,0.25); }
                15%  { box-shadow: 0 0 12px 3px #ff6a00, 0 0 28px 6px rgba(255,130,0,0.6), 0 0 55px 12px rgba(255,80,0,0.3); }
                30%  { box-shadow: 0 0 6px 2px #ff4500, 0 0 18px 4px rgba(255,80,0,0.4), 0 0 35px 6px rgba(255,50,0,0.2); }
                50%  { box-shadow: 0 0 14px 4px #ff8800, 0 0 32px 8px rgba(255,150,0,0.6), 0 0 60px 14px rgba(255,100,0,0.35); }
                65%  { box-shadow: 0 0 7px 2px #ff5500, 0 0 22px 5px rgba(255,90,0,0.5), 0 0 42px 8px rgba(255,60,0,0.25); }
                80%  { box-shadow: 0 0 16px 5px #ffaa00, 0 0 35px 10px rgba(255,160,0,0.55), 0 0 65px 16px rgba(255,110,0,0.3); }
                100% { box-shadow: 0 0 8px 2px #ff4500, 0 0 20px 4px rgba(255,100,0,0.5), 0 0 40px 8px rgba(255,60,0,0.25); }
              }
              @keyframes emberGlow2 {
                0%   { opacity: 0.5; box-shadow: 0 0 30px 10px rgba(255,80,0,0.3), 0 0 80px 25px rgba(255,50,0,0.15); }
                20%  { opacity: 0.7; box-shadow: 0 0 40px 15px rgba(255,120,0,0.4), 0 0 100px 35px rgba(255,70,0,0.2); }
                40%  { opacity: 0.4; box-shadow: 0 0 25px 8px rgba(255,60,0,0.25), 0 0 70px 20px rgba(255,40,0,0.12); }
                60%  { opacity: 0.8; box-shadow: 0 0 45px 18px rgba(255,140,0,0.45), 0 0 110px 40px rgba(255,80,0,0.22); }
                80%  { opacity: 0.5; box-shadow: 0 0 28px 10px rgba(255,90,0,0.35), 0 0 75px 22px rgba(255,55,0,0.16); }
                100% { opacity: 0.5; box-shadow: 0 0 30px 10px rgba(255,80,0,0.3), 0 0 80px 25px rgba(255,50,0,0.15); }
              }
              .fire-frame {
                position: relative;
                border-radius: 14px;
                border: 2px solid rgba(255, 120, 0, 0.7);
                animation: emberGlow1 1.8s ease-in-out infinite;
              }
              .fire-frame::before {
                content: '';
                position: absolute;
                inset: -3px;
                border-radius: 17px;
                border: 1px solid rgba(255, 160, 0, 0.3);
                animation: emberGlow2 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}</style>

            <div
              className="fire-frame p-1"
              style={{
                height: 'calc(100vh - 96px)',
                aspectRatio: '210 / 297',
                maxWidth: '100%',
              }}
            >
              <div
                className="relative w-full h-full rounded-xl overflow-hidden"
                style={{ background: '#000' }}
              >
                {!pdfLoaded && !pdfError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/80 backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 text-[#F1D89E] animate-spin" />
                    <p className="text-gray-300 text-sm">{t('cv.loading', 'Đang tải CV...')}</p>
                  </div>
                )}

                {pdfError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-black/80 backdrop-blur-sm rounded-xl">
                    <FileText className="w-12 h-12 text-red-400" />
                    <p className="text-gray-300 text-center">
                      {t('cv.error', 'Không thể hiển thị CV trực tiếp trên trình duyệt này.')}
                    </p>
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 bg-[#F1D89E] text-black font-bold px-6 py-2.5 rounded-full hover:bg-white transition-all hover:scale-105"
                    >
                      {t('cv.openNewTab', 'Mở trong tab mới')}
                    </a>
                  </div>
                )}

                {/* PDF iframe — vừa khung hình */}
                <iframe
                  src={`${cvUrl}#toolbar=0&navpanes=0&scrollbar=1&view=Fit`}
                  title="CV Preview"
                  className="w-full h-full rounded-xl"
                  style={{ border: 'none' }}
                  onLoad={() => setPdfLoaded(true)}
                  onError={() => setPdfError(true)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
