import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, X, ChevronRight } from 'lucide-react';
import ChromaKeyVideo from './ChromaKeyVideo';
import {
  getDirectChatSessionId,
  resetDirectChatSession,
  createChatHubConnection,
  fetchChatHistory
} from '../services/directChatService';

const AiChatWidget = lazy(() => import('./AiChatWidget'));
const DirectChatWidget = lazy(() => import('./DirectChatWidget'));

function AvatarButton({ isOpen, isPaused, unreadCount, isMenuOpen, onClick, buttonRef }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center justify-end -mb-2.5 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer outline-none select-none"
      title={
        isOpen
          ? 'Đóng cửa sổ trò chuyện'
          : isMenuOpen
          ? 'Đóng menu tùy chọn'
          : 'Trò chuyện cùng AI hoặc nhắn tin trực tiếp với Nam'
      }
      aria-label="Mở menu trò chuyện"
      aria-expanded={isOpen || isMenuOpen}
    >
      <div className="ai-avatar-media relative flex items-center justify-center filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
        <ChromaKeyVideo
          width="100%"
          height="100%"
          paused={isPaused}
        />
      </div>

      {!isOpen && (
        <>
          {unreadCount > 0 ? (
            <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold text-[10px] shadow-xl flex items-center gap-1 border border-white/20 animate-bounce">
              <MessageSquare className="w-3 h-3 fill-current" />
              <span>{unreadCount > 99 ? '99+' : `${unreadCount} tin mới`}</span>
            </span>
          ) : isMenuOpen ? (
            <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-[#161926] text-[#F1D89E] font-bold text-[10px] shadow-xl flex items-center gap-1 border border-[#F1D89E]/40">
              <X className="w-3 h-3" />
              <span>Đóng</span>
            </span>
          ) : (
            <span className="absolute top-1 -right-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e2c686] text-black font-bold text-[10px] shadow-xl flex items-center gap-1 border border-black/30 animate-bounce">
              <Sparkles className="w-3 h-3 animate-spin" />
              <span>Hỏi AI & Chat</span>
            </span>
          )}
        </>
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef(null);
  const avatarRef = useRef(null);
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

  // Kiểm tra tin nhắn chưa đọc từ Nam và duy trì kết nối nền SignalR
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    fetchChatHistory(sessionId)
      .then((messages) => {
        if (Array.isArray(messages)) {
          const unread = messages.filter((m) => m.isFromAdmin && !m.isReadByUser).length;
          setUnreadCount(unread);
        }
      })
      .catch(() => {});

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

  // Đóng popover menu khi bấm phím Esc hoặc click bên ngoài
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (avatarRef.current && avatarRef.current.contains(e.target)) return;
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleAvatarClick = () => {
    if (isAiOpen) {
      setIsAiOpen(false);
      notifyChatOpen(false);
      return;
    }
    if (isDirectOpen) {
      setIsDirectOpen(false);
      notifyChatOpen(false);
      return;
    }
    // Khi cả 2 chat đều đóng: Bấm avatar để mở/tắt menu lựa chọn
    setIsMenuOpen((prev) => !prev);
  };

  const handleSelectAi = () => {
    setIsMenuOpen(false);
    setIsDirectOpen(false);
    setIsAiActivated(true);
    setIsAiOpen(true);
    notifyChatOpen(true);
  };

  const handleSelectDirect = () => {
    setIsMenuOpen(false);
    setIsAiOpen(false);
    setIsDirectActivated(true);
    setIsDirectOpen(true);
    setUnreadCount(0);
    notifyChatOpen(true);
  };

  const isAnyChatOpen = isAiOpen || isDirectOpen;

  return (
    <div className="ai-chat-launcher flex flex-col items-end">
      {/* 1. Khung Chat AI */}
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

      {/* 2. Khung Chat trực tiếp với Nam */}
      {isDirectActivated && (
        <Suspense fallback={null}>
          <DirectChatWidget
            isOpen={isDirectOpen}
            onClose={() => {
              setIsDirectOpen(false);
              notifyChatOpen(false);
            }}
          />
        </Suspense>
      )}

      {/* 3. Popover Menu 2-in-1 khi click avatar */}
      {isMenuOpen && !isAnyChatOpen && (
        <div
          ref={menuRef}
          className="chat-choice-popover mb-2.5 w-[310px] sm:w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#0c0e18]/95 backdrop-blur-2xl border border-[#F1D89E]/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(241,216,158,0.15)] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 select-none pointer-events-auto"
        >
          {/* Header Popover */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#141622] via-[#1a1d2e] to-[#141622] border-b border-[#F1D89E]/20 flex items-center justify-between">
            <div>
              <h4 className="text-white text-xs sm:text-sm font-bold tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F1D89E]" /> Trung tâm kết nối
              </h4>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">
                Chọn kênh bạn muốn trò chuyện
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Đóng menu"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Danh sách 2 kênh lựa chọn */}
          <div className="p-2.5 sm:p-3 space-y-2">
            {/* Lựa chọn 1: Trợ lý AI */}
            <button
              type="button"
              onClick={handleSelectAi}
              className="group w-full p-2.5 sm:p-3 rounded-xl text-left transition-all duration-200 bg-white/[0.03] hover:bg-[#F1D89E]/10 border border-white/5 hover:border-[#F1D89E]/40 flex items-center gap-3 cursor-pointer outline-none active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 via-[#F1D89E]/20 to-transparent border border-[#F1D89E]/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(241,216,158,0.25)] group-hover:scale-105 group-hover:border-[#F1D89E] transition-all">
                <Sparkles className="w-5 h-5 text-[#F1D89E]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-[13px] font-bold text-white group-hover:text-[#F1D89E] transition-colors">
                    Hỏi Trợ lý AI
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#F1D89E]/20 text-[#F1D89E] text-[9px] font-extrabold border border-[#F1D89E]/30">
                    24/7 AI
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate group-hover:text-gray-300">
                  Giải đáp tức thì về hồ sơ, kỹ năng, dự án
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#F1D89E] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </button>

            {/* Lựa chọn 2: Chat trực tiếp với Nam */}
            <button
              type="button"
              onClick={handleSelectDirect}
              className="group w-full p-2.5 sm:p-3 rounded-xl text-left transition-all duration-200 bg-white/[0.03] hover:bg-[#F1D89E]/10 border border-white/5 hover:border-[#F1D89E]/40 flex items-center gap-3 cursor-pointer outline-none active:scale-[0.99] relative"
            >
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)] group-hover:scale-105 group-hover:border-emerald-400 transition-all">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0c0e18]" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0c0e18] animate-ping" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-[13px] font-bold text-white group-hover:text-[#F1D89E] transition-colors">
                    Chat trực tiếp với Nam
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-medium border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>Online
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5 truncate group-hover:text-gray-300">
                  Nhắn tin trao đổi công việc & kết nối trực tiếp
                </p>
              </div>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-black text-[10px] shadow-lg animate-bounce shrink-0 ml-1">
                  {unreadCount > 99 ? '99+' : `${unreadCount} mới`}
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#F1D89E] group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
              )}
            </button>
          </div>

          {/* Footer hướng dẫn */}
          <div className="px-3 py-2 bg-black/40 border-t border-white/5 text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
            <span>💡</span>
            <span>Bấm ra ngoài hoặc phím <b>Esc</b> để đóng</span>
          </div>
        </div>
      )}

      {/* 4. Nút Avatar AI */}
      <AvatarButton
        buttonRef={avatarRef}
        isOpen={isAnyChatOpen}
        isPaused={isAnyChatOpen}
        unreadCount={unreadCount}
        isMenuOpen={isMenuOpen}
        onClick={handleAvatarClick}
      />
    </div>
  );
}

