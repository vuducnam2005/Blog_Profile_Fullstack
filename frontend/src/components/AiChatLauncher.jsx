import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Sparkles, MessageCircleMore } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';
import {
  getDirectChatSessionId,
  createChatHubConnection,
  fetchChatHistory
} from '../services/directChatService';

const AiChatWidget = lazy(() => import('./AiChatWidget'));
const DirectChatWidget = lazy(() => import('./DirectChatWidget'));

function AvatarButton({ isOpen, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-end -mb-2.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none"
      title="Trò chuyện với Trợ lý AI của Nam"
      aria-label="Mở trợ lý AI"
      aria-expanded={isOpen}
    >
      <div className="ai-avatar-media relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
        <ChromaKeyVideo
          width="100%"
          height="100%"
        />
      </div>

      {!isOpen && (
        <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e2c686] text-black font-bold text-[10px] shadow-xl flex items-center gap-1 border border-black/30 animate-bounce">
          <Sparkles className="w-3 h-3 animate-spin" /> {'Hỏi AI'}
        </span>
      )}
    </button>
  );
}

function DirectChatButton({ isOpen, unreadCount, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative mb-1.5 px-3.5 py-2 rounded-full border text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none flex items-center gap-2 shadow-2xl ${
        isOpen
          ? 'bg-[#F1D89E] text-black border-[#F1D89E] shadow-[0_0_20px_rgba(241,216,158,0.6)]'
          : 'bg-[#0c0e17]/90 hover:bg-[#141724] text-[#F1D89E] hover:text-white border-[#F1D89E]/40 hover:border-[#F1D89E] shadow-[0_4px_20px_rgba(0,0,0,0.6)]'
      }`}
      title="Trò chuyện trực tiếp với Vũ Đức Nam"
      aria-label="Chat trực tiếp với Nam"
      aria-expanded={isOpen}
    >
      {/* Icon Chat */}
      <div className="relative flex items-center justify-center">
        <MessageCircleMore className={`w-4 h-4 ${isOpen ? 'text-black' : 'text-[#F1D89E]'}`} />
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black animate-pulse" />
        )}
      </div>

      {/* Label */}
      <span className="tracking-wide text-[11px] sm:text-xs">
        Chat với Nam
      </span>

      {/* Badge số tin nhắn chưa đọc từ Nam */}
      {unreadCount > 0 && !isOpen && (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-extrabold text-[9px] shadow-md animate-bounce">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function AiChatLauncher() {
  const [isAiActivated, setIsAiActivated] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const [isDirectActivated, setIsDirectActivated] = useState(false);
  const [isDirectOpen, setIsDirectOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const sessionIdRef = useRef(getDirectChatSessionId());

  // Kiểm tra tin nhắn chưa đọc từ Nam
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    fetchChatHistory(sessionId).then((messages) => {
      if (Array.isArray(messages)) {
        const unread = messages.filter((m) => m.isFromAdmin && !m.isReadByUser).length;
        setUnreadCount(unread);
      }
    }).catch(() => {});

    // Kết nối SignalR để nhận thông báo tin nhắn mới tức thì
    const hub = createChatHubConnection();
    hub.on('ReceiveMessage', (msg) => {
      if (msg.sessionId === sessionId && msg.isFromAdmin) {
        if (!isDirectOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    hub.start().then(() => {
      hub.invoke('JoinConversation', sessionId).catch(() => {});
    }).catch(() => {});

    return () => {
      hub.stop().catch(() => {});
    };
  }, [isDirectOpen]);

  const toggleAiChat = () => {
    setIsAiActivated(true);
    setIsAiOpen((current) => {
      const next = !current;
      if (next) setIsDirectOpen(false);
      return next;
    });
  };

  const toggleDirectChat = () => {
    setIsDirectActivated(true);
    setIsDirectOpen((current) => {
      const next = !current;
      if (next) {
        setIsAiOpen(false);
        setUnreadCount(0);
      }
      return next;
    });
  };

  return (
    <div className="ai-chat-launcher flex flex-col items-end">
      {/* Khung Chat AI */}
      {isAiActivated && (
        <Suspense fallback={null}>
          <AiChatWidget
            panelOnly
            isOpen={isAiOpen}
            onClose={() => setIsAiOpen(false)}
          />
        </Suspense>
      )}

      {/* Khung Chat trực tiếp với Nam */}
      {isDirectActivated && (
        <Suspense fallback={null}>
          <DirectChatWidget
            isOpen={isDirectOpen}
            onClose={() => setIsDirectOpen(false)}
          />
        </Suspense>
      )}

      {/* Nút "Chat với Nam" nằm phía trên đầu con AI */}
      <DirectChatButton
        isOpen={isDirectOpen}
        unreadCount={unreadCount}
        onClick={toggleDirectChat}
      />

      {/* Nút Avatar AI */}
      <AvatarButton
        isOpen={isAiOpen}
        onClick={toggleAiChat}
      />
    </div>
  );
}
