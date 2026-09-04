import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';
import {
  getDirectChatSessionId,
  resetDirectChatSession,
  createChatHubConnection,
  fetchChatHistory
} from '../services/directChatService';

const AiChatWidget = lazy(() => import('./AiChatWidget'));
const DirectChatWidget = lazy(() => import('./DirectChatWidget'));

function AvatarButton({ isOpen, isPaused, onClick }) {
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
          paused={isPaused}
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
      className={`group relative py-2.5 sm:py-3 pl-3 sm:pl-3.5 pr-2.5 sm:pr-3 rounded-l-2xl border-y border-l border-r-0 transition-all duration-300 hover:-translate-x-1.5 active:scale-95 cursor-pointer outline-none select-none flex items-center gap-2 sm:gap-2.5 shadow-[-8px_0_25px_rgba(0,0,0,0.7),0_0_18px_rgba(241,216,158,0.2)] backdrop-blur-2xl pointer-events-auto ${
        isOpen
          ? 'bg-gradient-to-r from-[#F1D89E] to-[#e6c87a] text-black border-[#F1D89E] shadow-[-8px_0_25px_rgba(241,216,158,0.6)]'
          : 'bg-[#0c0e18]/95 hover:bg-[#141726] text-white border-[#F1D89E]/45 hover:border-[#F1D89E]'
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
          className={`text-xs sm:text-[13px] font-extrabold tracking-wide whitespace-nowrap ${
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
  const isDirectOpenRef = useRef(isDirectOpen);
  isDirectOpenRef.current = isDirectOpen;

  // Tải trước bundle chat sau 2 giây khi trang đã rảnh (Zero delay khi click)
  useEffect(() => {
    const prefetchTimer = window.setTimeout(() => {
      import('./AiChatWidget');
      import('./DirectChatWidget');
    }, 2000);
    return () => window.clearTimeout(prefetchTimer);
  }, []);

  // Kiểm tra tin nhắn chưa đọc từ Nam và duy trì kết nối nền ổn định
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    fetchChatHistory(sessionId).then((messages) => {
      if (Array.isArray(messages)) {
        const unread = messages.filter((m) => m.isFromAdmin && !m.isReadByUser).length;
        setUnreadCount(unread);
      }
    }).catch(() => {});

    // Kết nối SignalR duy trì một lần, không ngắt khi đổi toggle
    const hub = createChatHubConnection();
    hub.on('ReceiveMessage', (msg) => {
      if (msg.sessionId === sessionId && msg.isFromAdmin) {
        if (!isDirectOpenRef.current) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    // Khi Admin xóa hội thoại trong lúc người dùng đang duyệt web (không mở chat)
    hub.on('SessionDeleted', (data) => {
      const targetId = data?.sessionId || data?.SessionId || (typeof data === 'string' ? data : '');
      const currentStored = getDirectChatSessionId();
      if (targetId && (targetId === sessionIdRef.current || targetId === currentStored)) {
        setUnreadCount(0);
        const newSessionId = resetDirectChatSession();
        sessionIdRef.current = newSessionId;
        hub.invoke('JoinConversation', newSessionId).catch(() => {});
        window.dispatchEvent(
          new CustomEvent('directChatSessionDeleted', {
            detail: { oldSessionId: targetId, newSessionId }
          })
        );
      }
    });

    hub.start().then(() => {
      hub.invoke('JoinConversation', sessionId).catch(() => {});
    }).catch(() => {});

    return () => {
      hub.stop().catch(() => {});
    };
  }, []);

  const notifyChatOpen = (isOpen) => {
    window.dispatchEvent(new CustomEvent('chatOpenChange', { detail: { isOpen } }));
  };

  // Tạm dừng Three.js canvas phía sau khi mở chat để giải phóng 100% CPU/GPU cho việc gõ phím mượt mà
  useEffect(() => {
    const isAnyChatOpen = isAiOpen || isDirectOpen;
    notifyChatOpen(isAnyChatOpen);
  }, [isAiOpen, isDirectOpen]);

  const toggleAiChat = () => {
    setIsAiActivated(true);
    setIsAiOpen((current) => {
      const next = !current;
      if (next) {
        setIsDirectOpen(false);
        notifyChatOpen(true);
      } else {
        notifyChatOpen(false);
      }
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
        notifyChatOpen(true);
      } else {
        notifyChatOpen(false);
      }
      return next;
    });
  };

  const isAnyChatOpen = isAiOpen || isDirectOpen;

  return (
    <>
      {/* ===== KHU VỰC CHAT TRỰC TIẾP VỚI NAM (Sát cạnh bên phải, ở giữa màn hình) ===== */}
      <div className="direct-chat-launcher fixed right-0 top-1/2 -translate-y-1/2 z-[60] pointer-events-auto select-none">
        <DirectChatButton
          isOpen={isDirectOpen}
          unreadCount={unreadCount}
          onClick={toggleDirectChat}
        />
      </div>

      {/* Khung Chat trực tiếp với Nam mở tại vị trí giữa bên phải màn hình */}
      {isDirectActivated && isDirectOpen && (
        <div className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-[70] pointer-events-auto select-none">
          <Suspense fallback={null}>
            <DirectChatWidget
              isOpen={isDirectOpen}
              onClose={() => {
                setIsDirectOpen(false);
                notifyChatOpen(false);
              }}
            />
          </Suspense>
        </div>
      )}

      {/* ===== KHU VỰC TRỢ LÝ AI (Góc dưới bên phải màn hình) ===== */}
      <div className="ai-chat-launcher flex flex-col items-end">
        {/* Khung Chat AI */}
        {isAiActivated && (
          <Suspense fallback={null}>
            <AiChatWidget
              panelOnly
              isOpen={isAiOpen}
              onClose={() => {
                setIsAiOpen(false);
                notifyChatOpen(false);
              }}
            />
          </Suspense>
        )}

        {/* Nút Avatar AI */}
        <AvatarButton
          isOpen={isAiOpen}
          isPaused={isAnyChatOpen}
          onClick={toggleAiChat}
        />
      </div>
    </>
  );
}
