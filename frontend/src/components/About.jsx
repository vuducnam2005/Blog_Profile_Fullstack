import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';

export default function About() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);

  const defaultSkillsCategories = [
    {
      id: 1,
      title: t('about.skills_backend', 'Backend & Database'),
      items: ['C# / .NET 9', 'Python', 'SQL Server', 'RESTful API', 'Entity Framework', 'C++']
    },
    {
      id: 2,
      title: t('about.skills_frontend', 'Frontend'),
      items: ['ReactJS', 'Vite', 'Three.js', 'TailwindCSS', 'HTML / CSS', 'JavaScript']
    },
    {
      id: 3,
      title: t('about.skills_other', 'Khác (Tools/Soft)'),
      items: ['Word/Excel', 'Giao tiếp tốt', 'Tư duy Logic', 'Đọc hiểu English', 'Làm việc nhóm']
    }
  ];

  const skillsCategories = data?.skillsCategories?.length > 0 ? data.skillsCategories : defaultSkillsCategories;

  return (
    <section id="about" className="min-h-screen flex flex-col justify-center pt-20 md:pt-24 pb-12 md:pb-16 px-3 md:px-12 lg:px-24">
      <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('about.title', 'Giới thiệu')}
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
        {/* Cột trái */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-gray-300 text-sm md:text-lg leading-relaxed mb-4 md:mb-6 font-light">
              {t('about.p1_1', 'Tôi là một ')}<span className="text-white font-semibold">{t('about.p1_2', 'Backend Developer (Fresher)')}</span>{t('about.p1_3', ' đầy nhiệt huyết với đam mê tạo ra các hệ thống web tối ưu và ổn định. Hiện đang theo học ngành CNTT tại Đại học Đại Nam (2023-2025), tôi lập tức tập trung sâu vào ')}<span className="text-[#F1D89E] font-medium">{t('about.p1_4', 'Python, C# .NET, SQL Server và phát triển REST API')}</span>.
            </p>
            <p className="text-gray-300 text-sm md:text-lg leading-relaxed font-light">
              {t('about.p2', 'Mục tiêu hướng tới của tôi là kiến thiết các giải pháp web backend linh hoạt, cho phép xử lý dữ liệu phức tạp, qua đó giúp các doanh nghiệp luôn nổi bật nhờ hệ thống cốt lõi vững vàng đằng sau.')}
            </p>
          </div>
          
          {/* Thông số dự án */}
          <div className="flex justify-between items-center mt-8 md:mt-12 gap-3 md:gap-4">
            {(data?.stats?.length > 0 ? data.stats : [
              { id: 1, value: '1+', label: t('about.stat1_label', 'Năm mài dũa code') },
              { id: 2, value: '3+', label: t('about.stat2_label', 'Dự án hoàn thành') },
              { id: 3, value: '10+', label: t('about.stat3_label', 'Công nghệ nền tảng') }
            ]).map((stat, idx) => (
              <div key={stat.id || idx} className="text-center">
                <p className="text-3xl md:text-5xl font-black text-[#F1D89E] mb-1 md:mb-2">{stat.value}</p>
                <p className="text-xs md:text-sm text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: Kỹ năng */}
        <div className="flex flex-col gap-6">
          <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{t('about.skills_title', 'Kỹ năng & Công nghệ')}</h3>
          
          {/* Khối kỹ năng */}
          {skillsCategories.map((cat, idx) => {
            const skillColors = [
              { bg: 'bg-gradient-to-br from-teal-900/60 to-cyan-900/40', border: 'border-teal-500/30 hover:border-teal-400/50 hover:shadow-[0_0_25px_rgba(20,184,166,0.15)]', title: 'text-teal-400', tag: 'bg-teal-500/15 border-teal-400/25' },
              { bg: 'bg-gradient-to-br from-purple-900/60 to-indigo-900/40', border: 'border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]', title: 'text-purple-400', tag: 'bg-purple-500/15 border-purple-400/25' },
              { bg: 'bg-gradient-to-br from-amber-900/60 to-orange-900/40', border: 'border-amber-500/30 hover:border-amber-400/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]', title: 'text-amber-400', tag: 'bg-amber-500/15 border-amber-400/25' },
              { bg: 'bg-gradient-to-br from-rose-900/60 to-pink-900/40', border: 'border-rose-500/30 hover:border-rose-400/50 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]', title: 'text-rose-400', tag: 'bg-rose-500/15 border-rose-400/25' },
              { bg: 'bg-gradient-to-br from-blue-900/60 to-sky-900/40', border: 'border-blue-500/30 hover:border-blue-400/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]', title: 'text-blue-400', tag: 'bg-blue-500/15 border-blue-400/25' },
              { bg: 'bg-gradient-to-br from-emerald-900/60 to-green-900/40', border: 'border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]', title: 'text-emerald-400', tag: 'bg-emerald-500/15 border-emerald-400/25' }
            ];
            const c = skillColors[idx % skillColors.length];
            return (
              <div key={cat.id || idx} className={`rounded-xl md:rounded-2xl p-4 md:p-6 ${c.bg} border ${c.border} transition-all duration-300`}>
                <p className={`${c.title} font-bold mb-3 md:mb-4 uppercase text-xs md:text-sm tracking-wider`}>{cat.title}</p>
                <div className="flex flex-wrap gap-2 md:gap-3">
                  {cat.items?.map((s, itemIdx) => (
                    <span key={`${s}-${itemIdx}`} className={`px-3 md:px-4 py-1.5 md:py-2 border ${c.tag} rounded-lg md:rounded-xl text-xs md:text-sm text-gray-200`}>{t(`about.soft_${s}`, s)}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
