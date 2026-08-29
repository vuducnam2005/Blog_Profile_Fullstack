import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { X, Send, User, MessageSquare, Edit3, Check, CheckCheck, Sparkles, Smile } from 'lucide-react';
import { PortfolioContext } from '../context/PortfolioContext';
import fallbackAvatarImg from '../assets/avatar.png';
import fallbackAvatarAvif from '../assets/avatar.avif';
import fallbackAvatarWebp from '../assets/avatar.webp';
import OptimizedImage from './OptimizedImage';
import {
  getDirectChatSessionId,
  getDirectChatUserName,
  setDirectChatUserName,
  resetDirectChatSession,
  createChatHubConnection,
  fetchChatHistory,
  sendChatMessage,
  markChatAsRead,
  playNotificationSound
} from '../services/directChatService';

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DirectChatWidget({ isOpen, onClose }) {
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};

  const [sessionId, setSessionId] = useState(getDirectChatSessionId);
  const [userName, setUserName] = useState(getDirectChatUserName);
  const [inputName, setInputName] = useState(userName || '');
  const [isEditingName, setIsEditingName] = useState(!userName);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNamTyping, setIsNamTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const chatEndRef = useRef(null);
  const hubConnectionRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const adminAvatar = hero.avatar || fallbackAvatarImg;

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
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [isOpen, messages.length, scrollToBottom]);

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

    // Khi Admin bấm xóa cuộc hội thoại: Phía đối phương bị xóa sạch và yêu cầu nhập lại tên từ đầu
    hub.on('SessionDeleted', (data) => {
      if (data.sessionId === sessionId) {
        setMessages([]);
        setUserName('');
        setInputName('');
        setIsEditingName(true);
        const nextSessionId = resetDirectChatSession();
        setSessionId(nextSessionId);
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

  if (!isOpen) return null;

  return (
    <div className="direct-chat-panel mb-2 bg-[#0d0f17]/95 backdrop-blur-2xl border border-[#F1D89E]/35 rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
      
      {/* HEADER */}
      <div className="p-3.5 bg-gradient-to-r from-[#131622] via-[#1a1d2e] to-[#131622] border-b border-[#F1D89E]/25 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Nam */}
          <div className="relative shrink-0 w-10 h-10 rounded-full border-2 border-[#F1D89E]/50 overflow-hidden shadow-[0_0_15px_rgba(241,216,158,0.3)] bg-black/60">
            <OptimizedImage
              src={adminAvatar}
              avifSrc={!hero.avatar ? fallbackAvatarAvif : undefined}
              webpSrc={!hero.avatar ? fallbackAvatarWebp : undefined}
              resolveSource={Boolean(hero.avatar)}
              alt="Vũ Đức Nam"
              widths={[40, 80]}
              sizes="40px"
              className="w-full h-full object-cover"
            />
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
          {userName && !isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              title={`Đổi tên hiển thị (hiện tại: ${userName})`}
              className="p-1.5 text-gray-400 hover:text-[#F1D89E] hover:bg-white/10 rounded-lg transition"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            title="Đóng khung chat"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MODAL / FORM NHẬP TÊN (KHI CHƯA ĐẶT TÊN HOẶC MUỐN ĐỔI TÊN) */}
      {isEditingName ? (
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
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black font-bold text-xs hover:shadow-[0_0_20px_rgba(241,216,158,0.4)] transition duration-300 disabled:opacity-40"
            >
              {userName ? 'Lưu & Tiếp tục' : 'Bắt đầu trò chuyện'}
            </button>
            {userName && (
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-xs text-gray-400 hover:text-gray-200 transition"
              >
                Hủy
              </button>
            )}
          </form>
        </div>
      ) : (
        <>
          {/* DANH SÁCH TIN NHẮN */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overscroll-contain space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {/* Lời chào mặc định của Nam */}
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 mt-0.5 bg-black/40">
                <OptimizedImage
                  src={adminAvatar}
                  alt="Đức Nam"
                  widths={[28, 56]}
                  sizes="28px"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="max-w-[82%] rounded-2xl rounded-tl-none p-3 text-xs leading-relaxed bg-[#181a26] text-gray-200 border border-white/10 shadow-md">
                <div className="text-[11px] font-semibold text-[#F1D89E] mb-1">
                  Vũ Đức Nam
                </div>
                <p>
                  Xin chào <span className="font-semibold text-[#F1D89E]">{userName}</span>! 👋 Mình là Nam. Bạn có thể nhắn tin trực tiếp với mình tại đây về công việc, hợp tác hoặc câu hỏi bất kỳ, mình sẽ nhận được và phản hồi sớm nhé!
                </p>
                <span className="block text-[9px] mt-1.5 text-right text-gray-400">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Các tin nhắn trong phiên */}
            {messages.map((msg, idx) => {
              const isMe = !msg.isFromAdmin;
              return (
                <div
                  key={msg.id || idx}
                  className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 mt-0.5 bg-black/40">
                      <OptimizedImage
                        src={adminAvatar}
                        alt="Đức Nam"
                        widths={[28, 56]}
                        sizes="28px"
                        className="w-full h-full object-cover"
                      />
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
                            <CheckCheck className="w-3 h-3 text-blue-800" title="Đã xem" />
                          ) : (
                            <Check className="w-3 h-3 text-black/50" title="Đã gửi" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isNamTyping && (
              <div className="flex gap-2.5 items-center">
                <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 bg-black/40">
                  <OptimizedImage
                    src={adminAvatar}
                    alt="Đức Nam"
                    widths={[28, 56]}
                    sizes="28px"
                    className="w-full h-full object-cover"
                  />
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
            <div className="px-3 py-2 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none">
              {quickStarters.map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(starter)}
                  className="whitespace-nowrap text-[11px] bg-white/5 hover:bg-[#F1D89E]/20 text-gray-300 hover:text-[#F1D89E] border border-white/10 hover:border-[#F1D89E]/40 px-3 py-1.5 rounded-full transition-all shrink-0"
                >
                  {starter}
                </button>
              ))}
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
              className="bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-30 text-black p-2.5 rounded-xl transition font-bold shadow-md shadow-[#F1D89E]/20"
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
