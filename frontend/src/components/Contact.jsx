import { Mail } from 'lucide-react';
import { useContext } from 'react';
import { PortfolioContext } from '../context/PortfolioContext';

const GithubIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
);

const FacebookIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const InstagramIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
);

import { useTranslation } from 'react-i18next';

export default function Contact() {
  const { t } = useTranslation();
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};

  return (
    <section id="contact" className="py-16 md:py-24 px-3 md:px-12 lg:px-24 relative z-10 w-full mb-6 md:mb-10">
      <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('contact.title', 'Liên hệ')}
      </h2>

      <div className="flex flex-col items-center justify-center text-center mt-4 md:mt-8">
        <p className="text-lg md:text-2xl text-white font-semibold mb-3 md:mb-4 tracking-wide">
          {t('contact.subtitle', 'Hãy cùng nhau tạo nên điều gì đó tuyệt vời! 🚀')}
        </p>

        <p className="text-gray-400 max-w-2xl mb-8 md:mb-12 text-xs md:text-base leading-relaxed">
          {t('contact.desc', 'Tôi luôn sẵn sàng thảo luận về các dự án mới, ý tưởng sáng tạo hoặc đơn giản là chia sẻ kiến thức. Đừng ngần ngại liên hệ với tôi!')}
        </p>

        <a
          href={`mailto:${hero.email || "vuducnam12345678@gmail.com"}`}
          className="bg-[#00D0C8] hover:bg-white text-black font-extrabold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 rounded-full shadow-[0_0_20px_rgba(0,208,200,0.5)] transition-all hover:scale-105 mb-8 md:mb-12"
        >
          {t('contact.emailBtn', 'Gửi Email Cho Tôi')}
        </a>

        <p className="text-gray-500 mb-6 text-sm uppercase tracking-widest font-semibold">{t('contact.socials', 'Hoặc kết nối qua:')}</p>

        <div className="flex gap-5 justify-center">
          <a
            href={hero.github?.startsWith('http') ? hero.github : `https://github.com${hero.github || "/vuducnam2005"}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-white/20 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-110"
          >
            <GithubIcon className="w-6 h-6 md:w-7 md:h-7" />
          </a>
          {hero.facebook && (
            <a
              href={hero.facebook}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-[#1877F2] hover:bg-[#1877F2]/15 hover:border-[#1877F2]/40 hover:shadow-[0_0_20px_rgba(24,119,242,0.4)] transition-all duration-300 hover:scale-110"
            >
              <FacebookIcon className="w-6 h-6 md:w-7 md:h-7" />
            </a>
          )}
          {hero.instagram && (
            <a
              href={hero.instagram}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-[#E4405F] hover:bg-[#E4405F]/15 hover:border-[#E4405F]/40 hover:shadow-[0_0_20px_rgba(228,64,95,0.4)] transition-all duration-300 hover:scale-110"
            >
              <InstagramIcon className="w-6 h-6 md:w-7 md:h-7" />
            </a>
          )}
          <a
            href={`mailto:${hero.email || "vuducnam12345678@gmail.com"}`}
            className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-[#EA4335] hover:bg-[#EA4335]/15 hover:border-[#EA4335]/40 hover:shadow-[0_0_20px_rgba(234,67,53,0.4)] transition-all duration-300 hover:scale-110"
          >
            <Mail className="w-6 h-6 md:w-7 md:h-7" />
          </a>
        </div>

        <div className="mt-12 md:mt-20 text-gray-600 text-xs border-t border-white/5 pt-4 md:pt-6 w-full max-w-md mx-auto">
          &copy; {new Date().getFullYear()} {hero.name || "Vũ Đức Nam"}. All rights reserved.
        </div>
      </div>
    </section>
  );
}
