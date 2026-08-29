import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Trash2,
  Send,
  User,
  Check,
  CheckCheck,
  RefreshCw,
  ArrowLeft,
  Clock,
  Sparkles,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { PortfolioContext } from '../../context/PortfolioContext';
import fallbackAvatarImg from '../../assets/avatar.png';
import fallbackAvatarAvif from '../../assets/avatar.avif';
import fallbackAvatarWebp from '../../assets/avatar.webp';
import OptimizedImage from '../OptimizedImage';
import {
  createChatHubConnection,
  fetchAdminSessions,
  fetchChatHistory,
  sendChatMessage,
  markChatAsRead,
  deleteAdminSession,
  playNotificationSound,
  formatMessageTime as formatTime
} from '../../services/directChatService';
import { ADMIN_API_KEY } from '../../context/AuthContext';

export default function DirectChatManager() {
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};
  const adminAvatar = hero.avatar || fallbackAvatarImg;

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const activeSessionRef = useRef(activeSessionId);
  const chatEndRef = useRef(null);
  const hubRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    activeSessionRef.current = activeSessionId;
  }, [activeSessionId]);

  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  // Tải danh sách hội thoại
  const loadSessions = useCallback(async (silent = false) => {
    if (!silent) setLoadingSessions(true);
    try {
      const list = await fetchAdminSessions();
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách hội thoại admin:', err);
    } finally {
      if (!silent) setLoadingSessions(false);
    }
  }, []);

  // Tải tin nhắn của phiên đang chọn
  const loadSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setLoadingMessages(true);
    try {
      const msgs = await fetchChatHistory(sessionId);
      setActiveMessages(msgs);
      await markChatAsRead(sessionId, true);
      // Cập nhật lại số chưa đọc trong state sessions
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, unreadCount: 0 } : s))
      );
    } catch (err) {
      console.error('Lỗi khi tải tin nhắn của phiên:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Kết nối SignalR Hub cho Admin
  useEffect(() => {
    loadSessions();

    const hub = createChatHubConnection();
    hubRef.current = hub;

    hub.on('ReceiveMessage', (msg) => {
      // Nếu là tin nhắn từ khách gửi
      if (!msg.isFromAdmin) {
        playNotificationSound();
      }

      // Nếu đang mở đúng hội thoại này
      if (activeSessionRef.current === msg.sessionId) {
        setActiveMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;

          // Thay thế tin nhắn tạm (optimistic) của Admin bằng tin nhắn thật từ server
          const optimisticIndex = prev.findIndex(
            (m) =>
              typeof m.id === 'number' &&
              m.id > 1000000000000 &&
              m.isFromAdmin === msg.isFromAdmin &&
              m.content === msg.content
          );

          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = msg;
            return updated;
          }

          return [...prev, msg];
        });
        markChatAsRead(msg.sessionId, true);
      }

      // Cập nhật danh sách sessions
      setSessions((prev) => {
        const existing = prev.find((s) => s.sessionId === msg.sessionId);
        if (existing) {
          return [
            {
              ...existing,
              lastMessage: msg.content,
              lastMessageTime: msg.createdAt,
              isLastFromAdmin: msg.isFromAdmin,
              unreadCount:
                activeSessionRef.current === msg.sessionId || msg.isFromAdmin
                  ? 0
                  : (existing.unreadCount || 0) + 1,
              senderName: msg.isFromAdmin ? existing.senderName : msg.senderName || existing.senderName
            },
            ...prev.filter((s) => s.sessionId !== msg.sessionId)
          ];
        } else {
          return [
            {
              sessionId: msg.sessionId,
              senderName: msg.senderName || 'Khách mới',
              lastMessage: msg.content,
              lastMessageTime: msg.createdAt,
              isLastFromAdmin: msg.isFromAdmin,
              unreadCount: msg.isFromAdmin ? 0 : 1,
              totalMessages: 1
            },
            ...prev
          ];
        }
      });
    });

    hub.on('ConversationUpdated', () => {
      loadSessions(true);
    });

    hub.on('UserTyping', (data) => {
      if (data.sessionId === activeSessionRef.current && !data.isFromAdmin) {
        setVisitorTyping(data.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => setVisitorTyping(false), 4000);
        }
      }
    });

    hub.on('MessagesRead', (data) => {
      if (data.sessionId === activeSessionRef.current && !data.isFromAdmin) {
        setActiveMessages((prev) =>
          prev.map((m) => (m.isFromAdmin ? { ...m, isReadByUser: true } : m))
        );
      }
    });

    hub.on('SessionDeleted', (data) => {
      setSessions((prev) => prev.filter((s) => s.sessionId !== data.sessionId));
      if (activeSessionRef.current === data.sessionId) {
        setActiveSessionId(null);
        setActiveMessages([]);
      }
    });

    hub
      .start()
      .then(async () => {
        await hub.invoke('JoinAdmin', ADMIN_API_KEY);
      })
      .catch((err) => {
        console.warn('SignalR Admin connection error:', err);
      });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      hub.stop().catch(() => {});
    };
  }, [loadSessions]);

  useEffect(() => {
    if (activeSessionId) {
      loadSessionMessages(activeSessionId);
    }
  }, [activeSessionId, loadSessionMessages]);

  useEffect(() => {
    if (activeMessages.length > 0) {
      scrollToBottom(false);
    }
  }, [activeMessages.length, scrollToBottom]);

  // Xử lý chọn hội thoại
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setMobileView('chat');
  };

  // Xử lý gửi tin nhắn từ Admin (Đức Nam)
  const handleSendReply = async (e) => {
    e?.preventDefault();
    const text = replyText.trim();
    if (!text || !activeSessionId || sending) return;

    setSending(true);
    setReplyText('');

    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sessionId: activeSessionId,
      senderName: 'Đức Nam',
      content: text,
      isFromAdmin: true,
      isReadByAdmin: true,
      isReadByUser: false,
      createdAt: new Date().toISOString()
    };

    setActiveMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      if (hubRef.current) {
        const saved = await hubRef.current.invoke(
          'SendMessage',
          activeSessionId,
          'Đức Nam',
          text,
          true,
          ADMIN_API_KEY
        );
        if (saved) {
          setActiveMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage({
          sessionId: activeSessionId,
          senderName: 'Đức Nam',
          content: text,
          isFromAdmin: true
        });
        setActiveMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      }
    } catch (err) {
      console.error('Lỗi khi Admin gửi tin nhắn:', err);
      // REST fallback
      try {
        const saved = await sendChatMessage({
          sessionId: activeSessionId,
          senderName: 'Đức Nam',
          content: text,
          isFromAdmin: true
        });
        setActiveMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      } catch (fallbackErr) {
        console.error('Admin send fallback failed:', fallbackErr);
      }
    } finally {
      setSending(false);
      scrollToBottom(true);
    }
  };

  const handleAdminTyping = (e) => {
    setReplyText(e.target.value);
    if (hubRef.current && activeSessionId) {
      hubRef.current
        .invoke('SendTyping', activeSessionId, 'Đức Nam', true, true)
        .catch(() => {});
    }
  };

  // Xóa hội thoại
  const handleDeleteSession = async (sessionId, e) => {
    e?.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ cuộc trò chuyện này?')) {
      return;
    }

    try {
      await deleteAdminSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveMessages([]);
        setMobileView('list');
      }
    } catch (err) {
      alert('Lỗi khi xóa hội thoại!');
      console.error(err);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.senderName && s.senderName.toLowerCase().includes(term)) ||
      (s.lastMessage && s.lastMessage.toLowerCase().includes(term)) ||
      (s.sessionId && s.sessionId.toLowerCase().includes(term))
    );
  });

  const activeSessionData = sessions.find((s) => s.sessionId === activeSessionId);
  const totalUnread = sessions.reduce((sum, s) => sum + (s.unreadCount || 0), 0);

  const quickReplies = [
    'Chào bạn! Mình có thể hỗ trợ gì cho bạn?',
    'Cảm ơn bạn đã quan tâm và liên hệ với mình nhé!',
    'Bạn có thể gửi thêm chi tiết qua Email: vuducnam12345678@gmail.com nhé!',
    'Dự án này mình phát triển bằng C# .NET và PostgreSQL đó bạn.'
  ];

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 pt-0 pb-10">
      <div className="bg-[#0b0d14]/95 backdrop-blur-2xl border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[680px] md:h-[740px] max-h-[82vh]">
        
        {/* ======================================================== */}
        {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI (SESSIONS LIST) */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 flex flex-col border-r border-white/10 bg-[#0d0f18]/90 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Danh Sách */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center text-[#F1D89E]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-white text-sm font-bold flex items-center gap-2">
                  Tin Nhắn Khách
                  {totalUnread > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold animate-pulse">
                      {totalUnread} mới
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-gray-400">
                  {sessions.length} cuộc hội thoại
                </p>
              </div>
            </div>

            <button
              onClick={() => loadSessions()}
              title="Làm mới danh sách"
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSessions ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, nội dung tin nhắn..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 focus:border-[#F1D89E] text-xs text-white placeholder-gray-500 outline-none transition"
              />
            </div>
          </div>

          {/* Danh Sách Cuộc Trò Chuyện */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
            {loadingSessions && sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#F1D89E]" />
                Đang tải hội thoại...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">
                <MessageCircle className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
                {searchTerm ? 'Không tìm thấy cuộc trò chuyện phù hợp.' : 'Chưa có tin nhắn nào từ khách.'}
              </div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = session.sessionId === activeSessionId;
                const hasUnread = (session.unreadCount || 0) > 0;

                return (
                  <div
                    key={session.sessionId}
                    onClick={() => handleSelectSession(session.sessionId)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#F1D89E]/15 border-l-4 border-l-[#F1D89E]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Avatar Ký Tự Khách */}
                    <div className="relative shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/15 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {session.senderName?.charAt(0)?.toUpperCase() || 'K'}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-black" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            hasUnread ? 'text-[#F1D89E] font-bold' : 'text-white'
                          }`}
                        >
                          {session.senderName || 'Khách truy cập'}
                        </h4>
                        <span className="text-[10px] text-gray-500 shrink-0">
                          {formatTime(session.lastMessageTime)}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate ${
                          hasUnread ? 'text-gray-200 font-medium' : 'text-gray-400'
                        }`}
                      >
                        {session.isLastFromAdmin && (
                          <span className="text-[#F1D89E] font-semibold mr-1">Bạn:</span>
                        )}
                        {session.lastMessage || '...'}
                      </p>
                    </div>

                    {/* Nút Xóa Phiên */}
                    <button
                      onClick={(e) => handleDeleteSession(session.sessionId, e)}
                      title="Xóa cuộc trò chuyện này"
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CỘT PHẢI: KHUNG CHAT CHI TIẾT VỚI KHÁCH */}
        {/* ======================================================== */}
        <div
          className={`flex-1 min-w-0 flex flex-col bg-[#0b0c14]/95 ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeSessionId ? (
            <>
              {/* Header Khung Chat */}
              <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-white font-bold text-base shadow-md">
                    {activeSessionData?.senderName?.charAt(0)?.toUpperCase() || 'K'}
                  </div>

                  <div>
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                      {activeSessionData?.senderName || 'Khách truy cập'}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/30 font-normal">
                        Trực tuyến
                      </span>
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Mã phiên: <span className="font-mono text-gray-300">{activeSessionId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDeleteSession(activeSessionId, e)}
                    title="Xóa toàn bộ tin nhắn cuộc trò chuyện này"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa hội thoại</span>
                  </button>
                </div>
              </div>

              {/* Danh Sách Tin Nhắn Của Phiên */}
              <div className="flex-1 min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-xs gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#F1D89E]" />
                    Đang tải lịch sử tin nhắn...
                  </div>
                ) : activeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs">
                    <MessageSquare className="w-10 h-10 text-gray-600 mb-2 opacity-50" />
                    Chưa có tin nhắn nào trong phiên này.
                  </div>
                ) : (
                  activeMessages.map((msg, idx) => {
                    const isNam = msg.isFromAdmin;

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex gap-3 ${isNam ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Avatar Khách */}
                        {!isNam && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">
                            {msg.senderName?.charAt(0)?.toUpperCase() || 'K'}
                          </div>
                        )}

                        {/* Bong bóng tin nhắn */}
                        <div
                          className={`max-w-[75%] sm:max-w-[65%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-lg ${
                            isNam
                              ? 'bg-gradient-to-r from-[#F1D89E] to-[#d4b775] text-black font-medium rounded-tr-none'
                              : 'bg-[#1a1d2e] text-gray-100 border border-white/10 rounded-tl-none'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-bold mb-1 flex items-center justify-between gap-2 ${
                              isNam ? 'text-black/70' : 'text-[#F1D89E]'
                            }`}
                          >
                            <span>{isNam ? 'Đức Nam (Bạn)' : msg.senderName || 'Khách'}</span>
                          </div>

                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] mt-1.5 ${
                              isNam ? 'text-black/60' : 'text-gray-400'
                            }`}
                          >
                            <span>{formatTime(msg.createdAt)}</span>
                            {isNam && (
                              <span>
                                {msg.isReadByUser ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-blue-800" title="Khách đã xem" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-black/50" title="Đã gửi" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Avatar Nam */}
                        {isNam && (
                          <div className="w-8 h-8 rounded-full border-2 border-[#F1D89E]/60 overflow-hidden shrink-0 mt-0.5 shadow-md bg-black/40">
                            <OptimizedImage
                              src={adminAvatar}
                              avifSrc={!hero.avatar ? fallbackAvatarAvif : undefined}
                              webpSrc={!hero.avatar ? fallbackAvatarWebp : undefined}
                              resolveSource={Boolean(hero.avatar)}
                              alt="Đức Nam"
                              widths={[32, 64]}
                              sizes="32px"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator từ khách */}
                {visitorTyping && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-white/10 flex items-center justify-center text-xs text-white">
                      {activeSessionData?.senderName?.charAt(0)?.toUpperCase() || 'K'}
                    </div>
                    <div className="bg-[#1a1d2e] px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-300 italic mr-1">
                        {activeSessionData?.senderName || 'Khách'} đang soạn tin
                      </span>
                      <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping" />
                      <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-100" />
                      <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-200" />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Gợi Ý Phản Hồi Nhanh Cho Nam */}
              <div className="px-4 py-2 bg-black/30 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setReplyText(reply);
                    }}
                    className="whitespace-nowrap text-[11px] bg-white/5 hover:bg-[#F1D89E]/20 text-gray-300 hover:text-[#F1D89E] border border-white/10 hover:border-[#F1D89E]/40 px-3 py-1 rounded-full transition-all shrink-0"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Khung Soạn Tin Nhắn Trả Lời Của Nam */}
              <form
                onSubmit={handleSendReply}
                className="p-3.5 bg-black/50 border-t border-white/10 flex gap-2.5 items-center"
              >
                <div className="w-8 h-8 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 hidden sm:block">
                  <OptimizedImage
                    src={adminAvatar}
                    alt="Đức Nam"
                    widths={[32, 64]}
                    sizes="32px"
                    className="w-full h-full object-cover"
                  />
                </div>

                <input
                  type="text"
                  value={replyText}
                  onChange={handleAdminTyping}
                  placeholder={`Trả lời ${activeSessionData?.senderName || 'khách'} với tên Đức Nam...`}
                  maxLength={1000}
                  className="flex-1 bg-white/5 border border-white/15 focus:border-[#F1D89E] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-30 text-black font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#F1D89E]/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-[#F1D89E]/10 border border-[#F1D89E]/30 flex items-center justify-center mb-4 text-[#F1D89E] shadow-xl shadow-[#F1D89E]/5">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="text-white text-base font-bold mb-1">
                Trung Tâm Quản Lý Tin Nhắn Trực Tiếp
              </h3>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-6">
                Chọn một khách truy cập từ danh sách bên trái để xem toàn bộ lịch sử và trả lời tin nhắn thời gian thực với tư cách <span className="text-[#F1D89E] font-semibold">Đức Nam</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
