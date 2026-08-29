import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
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
      className={`group relative mb-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none flex items-center gap-2 sm:gap-2.5 shadow-2xl backdrop-blur-2xl ${
        isOpen
          ? 'bg-gradient-to-r from-[#F1D89E] to-[#e6c87a] text-black border-[#F1D89E] shadow-[0_0_25px_rgba(241,216,158,0.7)]'
          : 'bg-[#0c0e18]/95 hover:bg-[#141726] text-white border-[#F1D89E]/45 hover:border-[#F1D89E] shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_18px_rgba(241,216,158,0.25)]'
      }`}
      title="Nhắn tin trực tiếp với Vũ Đức Nam"
      aria-label="Chat trực tiếp với Nam"
      aria-expanded={isOpen}
    >
      {/* Icon Tin Nhắn hình hộp phát sáng */}
      <div
        className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
          isOpen
            ? 'bg-black/15 text-black'
            : 'bg-gradient-to-br from-[#F1D89E]/30 to-amber-500/20 text-[#F1D89E] border border-[#F1D89E]/50 shadow-[0_0_12px_rgba(241,216,158,0.35)]'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0c0e18] animate-ping" />
        )}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#0c0e18]" />
        )}
      </div>

      {/* Label chữ */}
      <div className="flex flex-col text-left">
        <span
          className={`text-xs sm:text-[13px] font-extrabold tracking-wide ${
            isOpen
              ? 'text-black'
              : 'bg-gradient-to-r from-[#F1D89E] via-amber-200 to-[#e2c686] bg-clip-text text-transparent'
          }`}
        >
          Chat với Nam
        </span>
      </div>

      {/* Badge số tin nhắn chưa đọc từ Nam */}
      {unreadCount > 0 && !isOpen && (
        <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-black text-[10px] shadow-lg animate-bounce ml-0.5">
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

      {/* Nút "Chat với Nam" nằm phía trên đầu con AI với khoảng cách thoáng đẹp */}
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
