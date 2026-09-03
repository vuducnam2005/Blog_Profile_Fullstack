import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
  X,
  Send,
  User,
  MessageSquare,
  Edit3,
  Check,
  CheckCheck,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Mail
} from 'lucide-react';
import { PortfolioContext } from '../context/PortfolioContext';
import AdminAvatar from './AdminAvatar';
import {
  getDirectChatSessionId,
  getDirectChatUserName,
  setDirectChatUserName,
  resetDirectChatSession,
  createChatHubConnection,
  fetchChatHistory,
  sendChatMessage,
  markChatAsRead,
  playNotificationSound,
  formatMessageTime,
  formatDateDivider,
  isSameDay,
  registerSessionEmail
} from '../services/directChatService';

export default function DirectChatWidget({ isOpen, onClose }) {
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};

  const [sessionId, setSessionId] = useState(getDirectChatSessionId);
  const [userName, setUserName] = useState(getDirectChatUserName);
  const [inputName, setInputName] = useState(userName || '');
  const [isEditingName, setIsEditingName] = useState(!userName);
  const [isSessionDeletedNotice, setIsSessionDeletedNotice] = useState(false);

  // Trạng thái hỏi và lưu email nhận thông báo của khách
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInputMode, setEmailInputMode] = useState(false);
  const [visitorEmailInput, setVisitorEmailInput] = useState('');
  const [emailSavedToast, setEmailSavedToast] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNamTyping, setIsNamTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const chatEndRef = useRef(null);
  const hubConnectionRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const quickStarters = [
    '👋 Chào Nam!',
    '💼 Mình muốn trao đổi về cơ hội việc làm',
    '🚀 Mình quan tâm tới các dự án của Nam',
    '☕ Nam có đang rảnh để trò chuyện không?'
  ];

  const scrollToBottom = useCallback((smooth = true) => {
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  // Tải lịch sử tin nhắn ban đầu
  const loadHistory = useCallback(async () => {
    if (!sessionId) return;
    const history = await fetchChatHistory(sessionId);
    setMessages(history);
    if (history.length > 0) {
      markChatAsRead(sessionId, false);

      // Nếu đã có tin nhắn từ khách và chưa từng hỏi email cho phiên này
      const promptKey = `direct_chat_email_prompt_${sessionId}`;
      if (!localStorage.getItem(promptKey) && history.some((m) => !m.isFromAdmin)) {
        setShowEmailPrompt(true);
      }
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      const currentStoredName = getDirectChatUserName();
      const currentStoredSession = getDirectChatSessionId();
      if (!currentStoredName) {
        setUserName('');
        setInputName('');
        setIsEditingName(true);
        setMessages([]);
      } else {
        setUserName(currentStoredName);
      }
      if (currentStoredSession !== sessionId) {
        setSessionId(currentStoredSession);
      }
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  // Lắng nghe sự kiện xóa hội thoại phát ra từ toàn trang (khi đóng hoặc mở)
  useEffect(() => {
    const handleWindowSessionDeleted = (e) => {
      if (isOpen) {
        setIsSessionDeletedNotice(true);
      } else {
        setMessages([]);
        setUserName('');
        setInputName('');
        setIsEditingName(true);
        if (e.detail?.newSessionId) {
          setSessionId(e.detail.newSessionId);
        }
      }
    };

    window.addEventListener('directChatSessionDeleted', handleWindowSessionDeleted);
    return () => window.removeEventListener('directChatSessionDeleted', handleWindowSessionDeleted);
  }, [isOpen]);

  // Kết nối SignalR Hub
  useEffect(() => {
    if (!isOpen) return;

    const hub = createChatHubConnection();
    hubConnectionRef.current = hub;

    hub.on('ReceiveMessage', (msg) => {
      if (msg.sessionId === sessionId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;

          // Thay thế tin nhắn tạm thời (optimistic) của người gửi bằng tin nhắn thật từ server
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

        if (msg.isFromAdmin) {
          playNotificationSound();
          markChatAsRead(sessionId, false);
        }
      }
    });

    hub.on('MessagesRead', (data) => {
      if (data.sessionId === sessionId && data.isFromAdmin) {
        setMessages((prev) =>
          prev.map((m) => (!m.isFromAdmin ? { ...m, isReadByAdmin: true } : m))
        );
      }
    });

    hub.on('UserTyping', (data) => {
      if (data.sessionId === sessionId && data.isFromAdmin) {
        setIsNamTyping(data.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (data.isTyping) {
          typingTimeoutRef.current = setTimeout(() => setIsNamTyping(false), 4000);
        }
      }
    });

    // Khi Admin bấm xóa cuộc hội thoại trong lúc người dùng đang mở khung chat
    hub.on('SessionDeleted', (data) => {
      if (data.sessionId === sessionId) {
        setIsSessionDeletedNotice(true);
      }
    });

    hub
      .start()
      .then(() => {
        setIsConnected(true);
        hub.invoke('JoinConversation', sessionId).catch(console.error);
      })
      .catch((err) => {
        console.warn('SignalR DirectChat connection error, using REST fallback:', err);
        setIsConnected(false);
      });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      hub.stop().catch(() => {});
      hubConnectionRef.current = null;
    };
  }, [isOpen, sessionId]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const currentName = userName.trim() || 'Khách truy cập';
    setInput('');
    setLoading(true);

    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sessionId,
      senderName: currentName,
      content: text,
      isFromAdmin: false,
      isReadByAdmin: false,
      isReadByUser: true,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      if (hubConnectionRef.current && isConnected) {
        const saved = await hubConnectionRef.current.invoke('SendMessage', sessionId, currentName, text, false, null);
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage({
          sessionId,
          senderName: currentName,
          content: text,
          isFromAdmin: false
        });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
      // REST fallback
      try {
        const saved = await sendChatMessage({
          sessionId,
          senderName: currentName,
          content: text,
          isFromAdmin: false
        });
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      } catch (fallbackErr) {
        console.error('Fallback send failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
      scrollToBottom(true);

      // Kiểm tra và hiển thị prompt nhận email nếu chưa được hỏi trong phiên này
      const promptKey = `direct_chat_email_prompt_${sessionId}`;
      if (!localStorage.getItem(promptKey)) {
        setShowEmailPrompt(true);
      }
    }
  };

  const handleDeclineEmail = () => {
    setShowEmailPrompt(false);
    localStorage.setItem(`direct_chat_email_prompt_${sessionId}`, 'declined');
    registerSessionEmail(sessionId, '', false, userName).catch(() => {});
    if (hubConnectionRef.current && isConnected) {
      hubConnectionRef.current.invoke('RegisterVisitorEmail', sessionId, '', false, userName).catch(() => {});
    }
  };

  const handleSaveEmail = async (e) => {
    e?.preventDefault();
    const email = visitorEmailInput.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }

    setEmailLoading(true);
    try {
      await registerSessionEmail(sessionId, email, true, userName);
      if (hubConnectionRef.current && isConnected) {
        hubConnectionRef.current.invoke('RegisterVisitorEmail', sessionId, email, true, userName).catch(() => {});
      }
      localStorage.setItem(`direct_chat_email_prompt_${sessionId}`, 'saved');
      localStorage.setItem(`direct_chat_email_${sessionId}`, email);
      setShowEmailPrompt(false);
      setEmailSavedToast(`Đã lưu email (${email})! Nam sẽ gửi thông báo đến bạn khi có phản hồi.`);
      setTimeout(() => setEmailSavedToast(''), 6000);
    } catch (err) {
      console.error('Lỗi khi lưu email:', err);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSaveName = (e) => {
    e?.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setDirectChatUserName(trimmed);
    setIsEditingName(false);
  };

  const lastTypingSentRef = useRef(0);
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      if (hubConnectionRef.current && isConnected) {
        hubConnectionRef.current.invoke('SendTyping', sessionId, userName || 'Khách', true, false).catch(() => {});
      }
    }
  };

  // Quay lại và bắt đầu hội thoại mới khi phiên trước bị xóa
  const handleStartNewSession = () => {
    setIsSessionDeletedNotice(false);
    setShowEmailPrompt(false);
    setEmailInputMode(false);
    setVisitorEmailInput('');
    setEmailSavedToast('');
    setMessages([]);
    setUserName('');
    setInputName('');
    setIsEditingName(true);
    const nextSessionId = resetDirectChatSession();
    setSessionId(nextSessionId);
  };

  if (!isOpen) return null;

  return (
    <div className="direct-chat-panel mb-2 bg-[#0d0f17]/95 backdrop-blur-2xl border border-[#F1D89E]/35 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      
      {/* HEADER */}
      <div className="p-3.5 bg-gradient-to-r from-[#131622] via-[#1a1d2e] to-[#131622] border-b border-[#F1D89E]/25 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Nam */}
          <div className="relative shrink-0 w-10 h-10 rounded-full border-2 border-[#F1D89E]/50 overflow-hidden shadow-[0_0_15px_rgba(241,216,158,0.3)] bg-black/60">
            <AdminAvatar avatarUrl={hero.avatar} size={40} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-white text-sm font-bold tracking-wide truncate">
                {hero.name || 'Vũ Đức Nam'}
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-[#F1D89E]/20 text-[#F1D89E] text-[10px] font-semibold border border-[#F1D89E]/30">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Trực tiếp với Nam</span>
            </div>
          </div>
        </div>

        {/* Nút thao tác */}
        <div className="flex items-center gap-1">
          {userName && !isEditingName && !isSessionDeletedNotice && (
            <button
              onClick={() => setIsEditingName(true)}
              title={`Đổi tên hiển thị (hiện tại: ${userName})`}
              className="p-1.5 text-gray-400 hover:text-[#F1D89E] hover:bg-white/10 rounded-lg transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Đóng khung chat"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1. MÀN HÌNH THÔNG BÁO HỘI THOẠI ĐÃ BỊ XÓA (KHI ĐANG MỞ KHUNG CHAT) */}
      {isSessionDeletedNotice ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center bg-gradient-to-b from-transparent to-black/60 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-[#F1D89E] shadow-xl shadow-amber-500/10">
            <AlertCircle className="w-8 h-8 text-[#F1D89E]" />
          </div>
          <h4 className="text-white text-base font-bold mb-2">Cuộc hội thoại đã kết thúc</h4>
          <p className="text-xs text-gray-300 mb-6 max-w-xs leading-relaxed">
            Đức Nam đã xóa cuộc trò chuyện này. Bạn hãy bấm nút bên dưới để quay lại và nhập tên hiển thị mới nếu muốn trò chuyện tiếp nhé! ✨
          </p>

          <button
            type="button"
            onClick={handleStartNewSession}
            className="w-full max-w-xs py-3 px-4 rounded-xl bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black font-extrabold text-xs hover:shadow-[0_0_25px_rgba(241,216,158,0.5)] transition duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại & Nhập tên mới
          </button>
        </div>
      ) : isEditingName ? (
        /* 2. MODAL / FORM NHẬP TÊN (KHI CHƯA ĐẶT TÊN HOẶC MUỐN ĐỔI TÊN) */
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center bg-gradient-to-b from-transparent to-black/40">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F1D89E]/20 to-amber-500/10 border border-[#F1D89E]/40 flex items-center justify-center mb-4 shadow-lg shadow-[#F1D89E]/10">
            <MessageSquare className="w-7 h-7 text-[#F1D89E]" />
          </div>
          <h4 className="text-white text-base font-bold mb-1">Trò chuyện với Đức Nam</h4>
          <p className="text-xs text-gray-400 mb-5 max-w-xs leading-relaxed">
            Vui lòng nhập tên của bạn để Nam biết đang trò chuyện cùng ai nhé! ✨
          </p>

          <form onSubmit={handleSaveName} className="w-full max-w-xs space-y-3">
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn A, HR Tech..."
                autoFocus
                maxLength={40}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-[#F1D89E] text-white text-xs outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={!inputName.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black font-bold text-xs hover:shadow-[0_0_20px_rgba(241,216,158,0.4)] transition duration-300 disabled:opacity-40 cursor-pointer"
            >
              {userName ? 'Lưu & Tiếp tục' : 'Bắt đầu trò chuyện'}
            </button>
            {userName && (
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-xs text-gray-400 hover:text-gray-200 transition cursor-pointer"
              >
                Hủy
              </button>
            )}
          </form>
        </div>
      ) : (
        /* 3. KHUNG HIỂN THỊ TIN NHẮN */
        <>
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overscroll-contain space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {/* Lời chào mặc định của Nam */}
            {/* Lời chào mặc định của Nam */}
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 mt-0.5 bg-black/40 shadow-sm">
                <AdminAvatar avatarUrl={hero.avatar} size={28} />
              </div>
              <div className="max-w-[82%] rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed bg-[#181a26] text-gray-200 border border-white/10 shadow-md">
                <div className="text-[11px] font-semibold text-[#F1D89E] mb-1">
                  Vũ Đức Nam
                </div>
                <p>
                  Xin chào <span className="font-semibold text-[#F1D89E]">{userName}</span>! 👋 Mình là Nam. Bạn có thể nhắn tin trực tiếp với mình tại đây về công việc, hợp tác hoặc câu hỏi bất kỳ, mình sẽ nhận được và phản hồi sớm nhé!
                </p>
                <span className="block text-[9px] mt-1.5 text-right text-gray-400">
                  {formatMessageTime(new Date())}
                </span>
              </div>
            </div>

            {/* Các tin nhắn trong phiên */}
            {messages.map((msg, idx) => {
              const isMe = !msg.isFromAdmin;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isNewDay = !prevMsg || !isSameDay(msg.createdAt, prevMsg.createdAt);

              return (
                <div key={msg.id || idx}>
                  {/* Dải phân cách ngày nhắn */}
                  {isNewDay && (
                    <div className="flex justify-center my-3 select-none">
                      <span className="px-3 py-1 rounded-full bg-black/40 border border-[#F1D89E]/20 text-[#F1D89E] text-[10px] font-semibold tracking-wider shadow-sm backdrop-blur-md">
                        {formatDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 mt-0.5 bg-black/40 shadow-sm">
                        <AdminAvatar avatarUrl={hero.avatar} size={28} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-[#F1D89E] to-[#d4b775] text-black font-medium rounded-tr-none shadow-md'
                          : 'bg-[#181a26] text-gray-200 border border-white/10 rounded-tl-none shadow-md'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[10px] font-semibold text-[#F1D89E] mb-0.5">
                          Đức Nam
                        </div>
                      )}
                      <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                      <div
                        className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                          isMe ? 'text-black/60' : 'text-gray-400'
                        }`}
                      >
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {isMe && (
                          <span>
                            {msg.isReadByAdmin ? (
                              <CheckCheck className="w-3 motion-safe:animate-pulse text-blue-800" title="Đã xem" />
                            ) : (
                              <Check className="w-3 text-black/50" title="Đã gửi" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator từ Nam */}
            {isNamTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 bg-black/40 shadow-sm">
                  <AdminAvatar avatarUrl={hero.avatar} size={28} />
                </div>
                <div className="bg-[#181a26] px-3.5 py-2 rounded-2xl border border-white/10 flex items-center gap-1.5">
                  <span className="text-[10px] text-[#F1D89E] italic mr-1">Nam đang soạn tin</span>
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping" />
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-100" />
                  <div className="w-1.5 h-1.5 bg-[#F1D89E] rounded-full animate-ping delay-200" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* GỢI Ý TIN NHẮN MẪU NHANH */}
          {messages.length <= 1 && (
            <div
              className="px-3 py-2 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto select-none [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {quickStarters.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(starter)}
                  className="whitespace-nowrap text-[11px] bg-white/5 hover:bg-[#F1D89E]/20 text-gray-300 hover:text-[#F1D89E] border border-white/10 hover:border-[#F1D89E]/40 px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}

          {/* Thông Báo Lưu Email Thành Công */}
          {emailSavedToast && (
            <div className="mx-3 my-1.5 px-3 py-2 rounded-xl bg-emerald-950/85 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-lg animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] leading-tight">{emailSavedToast}</span>
              </div>
              <button
                onClick={() => setEmailSavedToast('')}
                className="text-emerald-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Banner Hỏi Khách Nhận Thông Báo Qua Email Khi Gửi Tin Nhắn Đầu Tiên */}
          {showEmailPrompt && (
            <div className="mx-3 my-1.5 p-3 rounded-2xl bg-[#161926] border border-[#F1D89E]/40 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!emailInputMode ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl shrink-0">💌</span>
                    <div>
                      <p className="text-xs text-white font-bold leading-tight">
                        Bạn có muốn nhận thông báo qua email khi Nam trả lời?
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Giúp bạn không bỏ lỡ phản hồi nếu rời khỏi trang web.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 mt-1 sm:mt-0">
                    <button
                      type="button"
                      onClick={() => setEmailInputMode(true)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black font-bold text-xs hover:opacity-90 transition shadow-sm cursor-pointer"
                    >
                      Có, nhận tin
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineEmail}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-xs transition cursor-pointer"
                    >
                      Để sau
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveEmail} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#F1D89E] font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#F1D89E]" /> Nhập địa chỉ email của bạn:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmailInputMode(false)}
                      className="text-gray-400 hover:text-gray-200 text-xs cursor-pointer"
                    >
                      ✕ Hủy
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      autoFocus
                      value={visitorEmailInput}
                      onChange={(e) => setVisitorEmailInput(e.target.value)}
                      placeholder="ví dụ: ban@gmail.com"
                      className="flex-1 bg-black/50 border border-white/20 focus:border-[#F1D89E] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={emailLoading || !visitorEmailInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black font-bold text-xs hover:opacity-90 disabled:opacity-40 transition shrink-0 cursor-pointer shadow-sm"
                    >
                      {emailLoading ? 'Đang lưu...' : 'Lưu email'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Ô NHẬP TIN NHẮN */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#11131c] border-t border-white/10 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={`Nhắn tin với tư cách "${userName}"...`}
              maxLength={1000}
              className="flex-1 bg-black/50 border border-white/10 focus:border-[#F1D89E] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-30 text-black p-2.5 rounded-xl transition font-bold shadow-md shadow-[#F1D89E]/20 cursor-pointer"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
