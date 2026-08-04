import { Mail, Phone, Globe, GraduationCap, Code, MapPin, Home } from 'lucide-react';
import fallbackAvatarImg from '../assets/avatar.png';
import fallbackAvatarAvif from '../assets/avatar.avif';
import fallbackAvatarWebp from '../assets/avatar.webp';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import OptimizedImage from './OptimizedImage';

export default function Hero() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="hero-section min-h-screen flex justify-center items-center pt-20 md:pt-24 px-3 md:px-8 lg:px-12">
       <div className="hero-card glass w-full max-w-6xl rounded-2xl md:rounded-3xl p-5 sm:p-7 md:p-12 flex flex-col lg:flex-row gap-8 md:gap-12 items-center lg:items-center bg-black/40 border-white/10 relative overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(241,216,158,0.15)] transition-shadow duration-500">
            
            {/* Glow effect đằng sau thẻ */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#F1D89E]/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* ================= CỘT TRÁI: AVATAR & TIỂU SỬ ================= */}
            <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10 w-full pl-0 lg:pl-4" data-aos="fade-right">
                {/* Avatar Tròn Vàng */}
                <div className="w-24 h-24 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(241,216,158,0.5)] mb-6 md:mb-8 tracking-tighter overflow-hidden border border-[#F1D89E]/40 shrink-0" data-aos="zoom-in" data-aos-delay="200">
                    <OptimizedImage
                      src={hero.avatar || fallbackAvatarImg}
                      avifSrc={!hero.avatar ? fallbackAvatarAvif : undefined}
                      webpSrc={!hero.avatar ? fallbackAvatarWebp : undefined}
                      resolveSource={Boolean(hero.avatar)}
                      alt="Avatar Vũ Đức Nam"
                      widths={[144, 288, 432]}
                      sizes="(min-width: 768px) 144px, 96px"
                      width="372"
                      height="371"
                      loading="eager"
                      fetchPriority="high"
                      className="w-full h-full object-cover"
                    />
                </div>
                
                {/* Tên & Chức vụ */}
                <h1 className="text-3xl md:text-5xl lg:text-5xl font-black text-white tracking-tight mb-2 md:mb-3" data-aos="fade-up" data-aos-delay="300">
                    {hero.name || "VŨ ĐỨC NAM"}
                </h1>
                <h2 className="text-xs md:text-lg font-bold text-[#F1D89E] mb-4 md:mb-6 tracking-[0.15em] md:tracking-[0.2em] uppercase" data-aos="fade-up" data-aos-delay="400">
                    {hero.title || "Backend Developer Fresher"}
                </h2>
                
                {/* Trích dẫn */}
                <p className="text-gray-300 text-sm md:text-lg mb-6 md:mb-10 italic font-light leading-relaxed max-w-lg" data-aos="fade-up" data-aos-delay="500">
                    {hero.bio || '"Sinh viên CNTT. Mong muốn phát triển chuyên sâu về Backend."'}
                </p>
                
                {/* Nút thao tác (Giữ lại nút tải CV gốc) */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start w-full" data-aos="fade-up" data-aos-delay="600">
                    <button 
                      onClick={() => scrollTo('projects')} 
                      className="w-full sm:w-auto bg-[#F1D89E] hover:bg-white text-black font-bold px-4 sm:px-6 md:px-8 py-2.5 md:py-3 rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(241,216,158,0.4)] text-[11px] sm:text-xs md:text-sm"
                    >
                      {t('hero.viewProjects', 'Xem dự án')}
                    </button>
                    <a 
                      href={hero.cvUrl ? (hero.cvUrl.startsWith('http') ? hero.cvUrl : `${API_BASE_URL}${hero.cvUrl}`) : "/CV_Vu_Duc_Nam.pdf"}
                      download
                      className="w-full sm:w-auto text-center bg-black/50 border border-[#F1D89E]/40 text-[#F1D89E] font-semibold px-4 sm:px-6 md:px-8 py-2.5 md:py-3 rounded-full hover:bg-[#F1D89E]/20 transition-all hover:scale-105 text-[11px] sm:text-xs md:text-sm"
                    >
                      {t('hero.downloadCv', 'Download CV')}
                    </a>
                </div>
            </div>

            {/* ================= CỘT PHẢI: INFO & SKILLS ================= */}
            <div className="flex-[1.2] w-full bg-white/5 border border-white/10 p-5 md:p-10 rounded-2xl md:rounded-3xl z-10 shadow-inner" data-aos="fade-left" data-aos-delay="200">
                {/* Thông tin liên hệ */}
                <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-10">
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><Mail className="w-5 h-5"/></div>
                        <span className="min-w-0 break-all text-sm md:text-base tracking-wide">{hero.email || "vuducnam12345678@gmail.com"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><Phone className="w-5 h-5"/></div>
                        <span className="text-sm md:text-base tracking-wide">{hero.phone || "0362 183 511"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><MapPin className="w-5 h-5"/></div>
                        <span className="min-w-0 break-words text-sm md:text-base tracking-wide">{hero.hometown || "Quê quán: Hợp Nhất, Đoan Hùng, Phú Thọ"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><Home className="w-5 h-5"/></div>
                        <span className="text-sm md:text-base tracking-wide">{hero.residence || "Nơi ở hiện tại: Hà Nội"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><Globe className="w-5 h-5"/></div>
                        <span className="min-w-0 break-all text-sm md:text-base tracking-wide">{hero.github || "/vuducnam2005"}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0 text-gray-300 hover:text-white transition-colors">
                        <div className="shrink-0 text-[#F1D89E] bg-[#F1D89E]/10 p-2.5 rounded-lg"><GraduationCap className="w-5 h-5"/></div>
                        <div className="min-w-0">
                            <p className="text-white font-semibold text-sm md:text-base tracking-wide">{hero.university || "Đại học Đại Nam"}</p>
                            <p className="text-sm text-gray-400 mt-0.5">{hero.gpa || "CNTT (2023-2025) • GPA: 3.52"}</p>
                        </div>
                    </div>
                </div>

                {/* Đường phân cách */}
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#F1D89E]/30 to-transparent mb-6 md:mb-10"></div>

                {/* Kỹ năng */}
                <div>
                    <h3 className="text-white font-bold mb-4 md:mb-6 flex items-center gap-3 text-base md:text-xl">
                        <Code className="w-5 h-5 md:w-6 md:h-6 text-[#F1D89E]"/> {t('hero.techSkills', 'Kỹ năng Công nghệ')}
                    </h3>
                    <div className="flex flex-wrap gap-2 md:gap-3">
                        {(hero.skills || ['Python', 'C# .NET', 'SQL Server', 'C++', 'HTML/CSS', 'REST API', 'ReactJS']).map((skill, idx) => (
                            <span key={`${skill}-${idx}`} className="px-3 md:px-5 py-1.5 md:py-2 bg-black/60 border border-[#F1D89E]/30 rounded-full text-xs md:text-sm font-medium text-gray-300 hover:border-[#F1D89E] hover:text-[#F1D89E] transition-all cursor-default shadow-lg">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            
       </div>
    </section>
  );
}
