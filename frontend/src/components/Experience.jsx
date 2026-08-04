import { GraduationCap, Briefcase, Award, Medal } from 'lucide-react';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { useTranslation } from 'react-i18next';

export default function Experience() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const experiences = data?.experiences || [];

  return (
    <section id="experience" className="deferred-section deferred-section--experience min-h-screen pt-20 md:pt-24 pb-12 md:pb-16 px-3 md:px-12 lg:px-24">
      <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-10 md:mb-16 flex items-center" data-aos="fade-right">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('exp.title', 'Kinh nghiệm & Học vấn')}
      </h2>
      
      <div className="mb-10 md:mb-16">
        <h3 className="text-xl md:text-2xl font-bold text-[#F1D89E] mb-6 md:mb-8 flex items-center gap-2 md:gap-3" data-aos="fade-right" data-aos-delay="200">
          <Briefcase className="w-6 h-6 md:w-8 md:h-8" /> {t('exp.journey', 'Hành trình Thực chiến')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
            {experiences.map((exp, idx) => {
                const cardColors = [
                    'bg-gradient-to-br from-teal-900/60 to-cyan-900/40 border-teal-500/30 hover:border-teal-400/60 hover:shadow-[0_0_25px_rgba(20,184,166,0.2)]',
                    'bg-gradient-to-br from-purple-900/60 to-indigo-900/40 border-purple-500/30 hover:border-purple-400/60 hover:shadow-[0_0_25px_rgba(168,85,247,0.2)]',
                    'bg-gradient-to-br from-amber-900/60 to-orange-900/40 border-amber-500/30 hover:border-amber-400/60 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]',
                    'bg-gradient-to-br from-rose-900/60 to-pink-900/40 border-rose-500/30 hover:border-rose-400/60 hover:shadow-[0_0_25px_rgba(244,63,94,0.2)]',
                    'bg-gradient-to-br from-emerald-900/60 to-green-900/40 border-emerald-500/30 hover:border-emerald-400/60 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]',
                    'bg-gradient-to-br from-blue-900/60 to-sky-900/40 border-blue-500/30 hover:border-blue-400/60 hover:shadow-[0_0_25px_rgba(59,130,246,0.2)]'
                ];
                const colorClass = cardColors[idx % cardColors.length];
                return (
                    <div key={idx} className={`border-l-2 border-[#F1D89E]/30 pl-4 md:pl-6 ml-3 md:ml-4 relative p-4 md:p-6 rounded-xl md:rounded-2xl transition-all duration-300 border ${colorClass}`} data-aos="fade-up" data-aos-delay={200 + (idx * 100)}>
                        <div className="absolute w-3 h-3 md:w-4 md:h-4 rounded-full bg-[#F1D89E] -left-[7px] md:-left-[9px] top-5 md:top-6 shadow-[0_0_10px_#F1D89E]"></div>
                        <p className="text-[#F1D89E] text-xs md:text-sm font-semibold mb-1">{exp.year}</p>
                        <h4 className="text-lg md:text-xl font-bold text-white mb-1 md:mb-2">{exp.title}</h4>
                        <p className="text-gray-300 font-light mb-1 md:mb-2 text-sm md:text-base">{exp.company}</p>
                        <p className="text-xs md:text-sm text-gray-300 italic">"{exp.description}"</p>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Chứng chỉ & Giải thưởng */}
      <h3 className="text-xl md:text-2xl font-bold text-[#F1D89E] mb-4 md:mb-6 flex items-center gap-2 md:gap-3 mt-6 md:mt-8" data-aos="fade-right" data-aos-delay="200">
        <Medal className="w-6 h-6 md:w-8 md:h-8" /> {t('exp.awards', 'Chứng chỉ & Giải thưởng')}
      </h3>
      
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/30 border border-emerald-500/25 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center hover:border-emerald-400/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] transition-all duration-300" data-aos="fade-up" data-aos-delay="300">
          <div className="p-4 bg-emerald-500/15 rounded-xl border border-emerald-400/25">
            <Award className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-bold text-white mb-1">{t('exp.award1_title', 'Giải Nhì - Cuộc thi Tài năng Lập trình cơ bản Khoa CNTT')}</h4>
            <p className="text-xs md:text-sm text-gray-300">{t('exp.award1_desc', 'Thiết kế Algorithms (C/C++, Python)')}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-violet-900/50 to-blue-900/30 border border-violet-500/25 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center hover:border-violet-400/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)] transition-all duration-300" data-aos="fade-up" data-aos-delay="400">
          <div className="p-4 bg-violet-500/15 rounded-xl border border-violet-400/25">
            <Medal className="w-8 h-8 text-violet-400" />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-bold text-white mb-1">{t('exp.award2_title', 'Chứng chỉ Gemini University Student')}</h4>
            <p className="text-xs md:text-sm text-gray-300">{t('exp.award2_desc', 'Top sinh viên nổi bật tiếp cận công nghệ học máy Gemini')}</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-900/50 to-pink-900/30 border border-rose-500/25 rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center hover:border-rose-400/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)] transition-all duration-300" data-aos="fade-up" data-aos-delay="500">
          <div className="p-4 bg-rose-500/15 rounded-xl border border-rose-400/25">
            <GraduationCap className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-bold text-white mb-1">{t('exp.award3_title', 'Học bổng Xuất sắc ĐH Đại Nam (Nhiều kỳ liên tiếp)')}</h4>
            <p className="text-xs md:text-sm text-gray-300">{t('exp.award3_desc', 'Thành tích học tập (GPA Top Đại Nam)')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
