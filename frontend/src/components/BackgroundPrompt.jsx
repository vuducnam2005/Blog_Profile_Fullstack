import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, X } from 'lucide-react';
import { BackgroundContext } from '../context/BackgroundContext';

const PROMPT_DELAY_MS = 10_000;
const PROMPT_SESSION_KEY = 'backgroundPromptHandled';

export default function BackgroundPrompt() {
  const { bgMode, toggleBgMode } = useContext(BackgroundContext);
  const [isVisible, setIsVisible] = useState(false);
  const primaryButtonRef = useRef(null);

  const markHandled = useCallback(() => {
    try {
      sessionStorage.setItem(PROMPT_SESSION_KEY, 'true');
    } catch {
      // Dismissing still works when browser storage is unavailable.
    }
  }, []);

  const handleDismiss = useCallback(() => {
    markHandled();
    setIsVisible(false);
  }, [markHandled]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PROMPT_SESSION_KEY) === 'true') return undefined;
    } catch {
      // The prompt still works when browser storage is unavailable.
    }

    const timerId = window.setTimeout(() => setIsVisible(true), PROMPT_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleDismiss();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleDismiss, isVisible]);

  const handleChangeBackground = () => {
    markHandled();
    toggleBgMode();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const switchingToNexbot = bgMode !== 'spline';
  const nextBackground = switchingToNexbot ? 'Nexbot 3D' : 'vũ trụ 3D';
  const NextBackgroundIcon = switchingToNexbot ? Bot : Sparkles;

  return (
    <div
      className="background-prompt fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="background-prompt-title"
      aria-describedby="background-prompt-description"
    >
      <div className="background-prompt-card relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-cyan-300/25 bg-[#061017]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.68)] sm:p-8">
        <div className="background-prompt-aurora absolute inset-0 pointer-events-none" />

        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/30 p-2 text-white/60 transition hover:border-white/25 hover:text-white"
          aria-label="Giữ nền hiện tại và đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(92,243,231,0.16)]">
            <NextBackgroundIcon className="h-7 w-7" />
          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">
            Làm mới không gian
          </p>
          <h2 id="background-prompt-title" className="mb-3 text-2xl font-extrabold text-white sm:text-3xl">
            Bạn muốn giao diện đặc sắc hơn?
          </h2>
          <p id="background-prompt-description" className="mb-7 leading-relaxed text-slate-300">
            Bạn có muốn chuyển sang nền {nextBackground} để trải nghiệm trang web sinh động hơn không?
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={handleChangeBackground}
              className="background-prompt-primary flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 font-extrabold text-[#041014] transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-[#061017]"
            >
              <NextBackgroundIcon className="h-4 w-4" />
              Đổi sang {nextBackground}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              Giữ nền hiện tại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
