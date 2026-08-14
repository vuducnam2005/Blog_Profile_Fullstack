import { Globe, ExternalLink } from 'lucide-react';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';
import { useTranslation } from 'react-i18next';

export default function Projects() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const projects = data?.projects || [];

  return (
    <section id="projects" className="portfolio-section deferred-section deferred-section--projects min-h-screen pt-20 md:pt-24 pb-12 md:pb-16 px-3 md:px-12 lg:px-24">
       <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center" data-aos="fade-right">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('projects.title', 'Dự án Nổi bật')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        {projects.map((p, idx) => {
          const projectColors = [
            { bg: 'from-blue-900/60 to-indigo-900/40', border: 'border-blue-500/30', hover: 'hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]', tag: 'bg-blue-500/15 border-blue-400/30' },
            { bg: 'from-emerald-900/60 to-teal-900/40', border: 'border-emerald-500/30', hover: 'hover:border-emerald-400/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]', tag: 'bg-emerald-500/15 border-emerald-400/30' },
            { bg: 'from-purple-900/60 to-violet-900/40', border: 'border-purple-500/30', hover: 'hover:border-purple-400/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]', tag: 'bg-purple-500/15 border-purple-400/30' },
            { bg: 'from-rose-900/60 to-pink-900/40', border: 'border-rose-500/30', hover: 'hover:border-rose-400/60 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]', tag: 'bg-rose-500/15 border-rose-400/30' },
            { bg: 'from-amber-900/60 to-orange-900/40', border: 'border-amber-500/30', hover: 'hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]', tag: 'bg-amber-500/15 border-amber-400/30' },
            { bg: 'from-cyan-900/60 to-sky-900/40', border: 'border-cyan-500/30', hover: 'hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]', tag: 'bg-cyan-500/15 border-cyan-400/30' }
          ];
          const c = projectColors[idx % projectColors.length];
          return (
            <div key={p.id} className={`nexbot-content-card bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl md:rounded-2xl p-5 md:p-8 ${c.hover} transition-all duration-300 hover:-translate-y-2 group relative overflow-hidden`} data-aos="zoom-in" data-aos-delay={200 + (idx * 50)}>
               <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-[#F1D89E] transition-colors">{p.title}</h3>
                  <div className="flex gap-3">
                    <a href={p.github} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors">
                      <Globe className="w-6 h-6" />
                    </a>
                    <a href={p.github} target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors">
                      <ExternalLink className="w-6 h-6" />
                    </a>
                  </div>
               </div>
               <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-6 md:mb-8">{p.description}</p>
               
               <div className="flex flex-wrap gap-2 mt-auto">
                  {p.tech.map(t => (
                    <span key={t} className={`px-3 py-1 ${c.tag} border rounded-full text-xs text-gray-200`}>{t}</span>
                  ))}
               </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
