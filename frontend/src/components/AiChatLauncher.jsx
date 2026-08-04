import { lazy, Suspense, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';

const AiChatWidget = lazy(() => import('./AiChatWidget'));

function AvatarButton({ isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-end -mb-2.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none"
      title="Tro chuyen voi Tro ly AI Nam"
      aria-label="Mo tro ly AI"
      aria-expanded={isOpen}
    >
      <div className="relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
        <ChromaKeyVideo
          width="clamp(112px, 24vw, 150px)"
          height="clamp(127px, 27.2vw, 170px)"
          sensitivity={38}
          smoothness={18}
        />
      </div>

      {!isOpen && (
        <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e2c686] text-black font-bold text-[10px] shadow-xl flex items-center gap-1 border border-black/30 animate-bounce">
          <Sparkles className="w-3 h-3 animate-spin" /> {'H\u1ecfi AI'}
        </span>
      )}
    </button>
  );
}

export default function AiChatLauncher() {
  const [isActivated, setIsActivated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsActivated(true);
    setIsOpen((current) => !current);
  };

  return (
    <div className="fixed bottom-0 right-4 sm:right-6 z-50 flex flex-col items-end">
      {isActivated && (
        <Suspense key="ai-chat-panel" fallback={null}>
          <AiChatWidget
            panelOnly
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        </Suspense>
      )}
      <AvatarButton key="ai-avatar" isOpen={isOpen} onClick={toggleChat} />
    </div>
  );
}
