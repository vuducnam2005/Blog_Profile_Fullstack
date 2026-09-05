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
  Mail,
  Reply,
  MoreHorizontal,
  Copy,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { PortfolioContext } from '../context/PortfolioContext';
import AdminAvatar from './AdminAvatar';
import { uploadFile } from '../utils/upload';
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
  registerSessionEmail,
  getFullMediaUrl
} from '../services/directChatService';

function ImageLightboxModal({ imageUrl, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        title="Đóng (Esc)"
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[95vw] max-h-[90vh] flex flex-col items-center"
      >
        <img
          src={imageUrl}
          alt="Ảnh phóng to"
          className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10"
        />
        <div className="mt-3 flex items-center gap-3">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-[#F1D89E] hover:text-black text-white text-xs font-medium transition flex items-center gap-1.5 shadow-md"
          >
            Mở ảnh gốc trong tab mới
          </a>
        </div>
      </div>
    </div>
  );
}

function VisitorChatMessageBubble({
  msg,
  heroAvatar,
  onReply,
  onScrollToMessage,
  onPreviewImage,
  isHighlighted,
  activeMenuId,
  setActiveMenuId
}) {
  const isMe = !msg.isFromAdmin;
  const rawImageUrl = msg.imageUrl || msg.ImageUrl;
  const isContentImageUrl =
    !rawImageUrl &&
    typeof msg.content === 'string' &&
    (msg.content.startsWith('http://') || msg.content.startsWith('https://') || msg.content.startsWith('/uploads/')) &&
    (msg.content.includes('res.cloudinary.com') ||
      msg.content.includes('/uploads/') ||
      /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(msg.content));
  const effectiveImageUrl = rawImageUrl || (isContentImageUrl ? msg.content : null);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isScrollRef = useRef(false);
  const isHorizontalRef = useRef(false);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    isScrollRef.current = false;
    isHorizontalRef.current = false;
    setIsDragging(false);
  };

  const handleTouchMove = (e) => {
    if (isScrollRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isHorizontalRef.current && !isScrollRef.current) {
      if (Math.abs(dy) > Math.abs(dx)) {
        isScrollRef.current = true;
        return;
      }
      if (Math.abs(dx) > 8) {
        isHorizontalRef.current = true;
        setIsDragging(true);
      }
    }

    if (isHorizontalRef.current) {
      // Messenger style: vuốt sang trái để kéo bong bóng ra
      const effectivePull = -dx;
      if (effectivePull > 0) {
        const damped = Math.min(effectivePull * 0.45, 60);
        setDragX(-damped);
      } else {
        setDragX(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalRef.current && Math.abs(dragX) >= 32) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch {}
      }
      onReply(msg);
    }
    setDragX(0);
    setIsDragging(false);
    isHorizontalRef.current = false;
    isScrollRef.current = false;
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setActiveMenuId(null);
      }, 1000);
    }
  };

  const isMenuOpen = activeMenuId === msg.id;
  const isTriggered = Math.abs(dragX) >= 32;

  return (
    <div
      id={`visitor-msg-${msg.id}`}
      className="relative group/msg my-1 select-text"
    >
      {/* Icon Reply tròn hiển thị khi vuốt trên điện thoại */}
      <div
        className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none md:hidden flex items-center justify-center transition-all ${
          Math.abs(dragX) > 8 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isTriggered
              ? 'bg-[#F1D89E] text-black scale-110 ring-2 ring-[#F1D89E]/60'
              : 'bg-white/20 text-white'
          }`}
          style={{
            transform: `rotate(${Math.min(Math.abs(dragX) * 4.5, 180)}deg)`
          }}
        >
          <Reply className="w-3.5 h-3.5" />
        </div>
      </div>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)'
        }}
        className={`flex items-end gap-2 sm:gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar Nam */}
        {!isMe && (
          <div className="w-7 h-7 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 mb-1 bg-black/40 shadow-sm">
            <AdminAvatar avatarUrl={heroAvatar} size={28} />
          </div>
        )}

        {/* Nút 3 chấm trên Desktop (nằm bên trái nếu là tin nhắn của mình) */}
        {isMe && (
          <div className="relative hidden md:flex items-center self-center opacity-0 group-hover/msg:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : msg.id);
              }}
              title="Tùy chọn tin nhắn"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Popover Menu Desktop */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-full mr-1.5 bottom-0 z-30 w-32 bg-[#181b2a] border border-white/15 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    onReply(msg);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-[#F1D89E] hover:bg-white/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5 text-[#F1D89E]" />
                  <span>Trả lời</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bong bóng tin nhắn */}
        <div
          className={`relative max-w-[86%] sm:max-w-[72%] rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs leading-relaxed shadow-md transition-all ${
            isMe
              ? 'bg-gradient-to-r from-[#F1D89E] to-[#d8ba70] text-black font-medium rounded-tr-xs'
              : 'bg-[#181a26] text-gray-100 border border-white/10 rounded-tl-xs'
          } ${
            isHighlighted
              ? 'ring-4 ring-[#F1D89E] shadow-[0_0_25px_rgba(241,216,158,0.8)] scale-[1.02] duration-300'
              : ''
          }`}
        >
          {/* Khung trích dẫn tin nhắn gốc (Quoted Message) phong cách Messenger */}
          {msg.replyToContent && (
            <div
              onClick={() => onScrollToMessage(msg.replyToId)}
              className={`mb-1.5 rounded-xl px-2.5 py-1.5 text-left cursor-pointer transition-all select-none ${
                isMe
                  ? 'bg-white/50 hover:bg-white/65 border-l-[3px] border-amber-900/80 shadow-xs'
                  : 'bg-white/[0.08] hover:bg-white/[0.13] border-l-[3px] border-[#F1D89E] shadow-xs'
              }`}
              title="Bấm để cuộn đến tin nhắn gốc"
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
                <Reply className={`w-3 h-3 shrink-0 ${isMe ? 'text-amber-950' : 'text-[#F1D89E]'}`} />
                <span className={`truncate ${isMe ? 'text-amber-950' : 'text-[#F1D89E]'}`}>
                  {msg.replyToSender ? `Trả lời ${msg.replyToSender}` : 'Trả lời tin nhắn'}
                </span>
              </div>
              <p className={`text-[11px] truncate max-w-full leading-tight mt-0.5 font-normal ${isMe ? 'text-stone-900' : 'text-gray-300'}`}>
                {msg.replyToContent === '[Hình ảnh]' ? '📷 [Hình ảnh]' : msg.replyToContent}
              </p>
            </div>
          )}

          {/* Hình ảnh đính kèm */}
          {effectiveImageUrl && (
            <div
              className="mb-1 rounded-xl overflow-hidden cursor-pointer group/img relative shadow-sm border border-black/10 hover:opacity-95 transition-all"
              onClick={() => onPreviewImage && onPreviewImage(getFullMediaUrl(effectiveImageUrl))}
              title="Bấm để phóng to xem chi tiết ảnh"
            >
              <img
                src={getFullMediaUrl(effectiveImageUrl)}
                alt="Ảnh đính kèm"
                className="max-w-full max-h-60 sm:max-h-80 rounded-xl object-cover block"
                loading="lazy"
              />
            </div>
          )}

          {/* Nội dung chính (chỉ hiển thị nếu có text khác [Hình ảnh] hoặc không có ảnh) */}
          {(!effectiveImageUrl || (msg.content && msg.content !== '[Hình ảnh]')) && msg.content && (
            <div className="whitespace-pre-wrap break-words text-[13px] sm:text-xs leading-relaxed">{msg.content}</div>
          )}

          {/* Thời gian & Trạng thái đã xem */}
          <div
            className={`flex items-center justify-end gap-1 text-[9.5px] mt-1 ${
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

        {/* Nút 3 chấm trên Desktop (nằm bên phải nếu là tin nhắn của Nam) */}
        {!isMe && (
          <div className="relative hidden md:flex items-center self-center opacity-0 group-hover/msg:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : msg.id);
              }}
              title="Tùy chọn tin nhắn"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Popover Menu Desktop */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-full ml-1.5 bottom-0 z-30 w-32 bg-[#181b2a] border border-white/15 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    onReply(msg);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-[#F1D89E] hover:bg-white/10 flex items-center gap-2 transition cursor-pointer"
                >
                  <Reply className="w-3.5 h-3.5 text-[#F1D89E]" />
                  <span>Trả lời</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Messenger-style Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const inputRef = useRef(null);

  // Trạng thái gửi ảnh & phóng to ảnh
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn file hình ảnh (JPG, PNG, GIF, WebP)!');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 10MB!');
      return;
    }
    setSelectedImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    e.target.value = '';
  };

  const handleRemoveSelectedImage = () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          if (file.size > 10 * 1024 * 1024) {
            alert('Dung lượng ảnh tối đa là 10MB!');
            return;
          }
          setSelectedImageFile(file);
          const preview = URL.createObjectURL(file);
          setImagePreviewUrl(preview);
          break;
        }
      }
    }
  };

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

  // Bắt đầu trả lời một tin nhắn (Quote)
  const handleInitiateReply = useCallback((message) => {
    setReplyingTo(message);
    setActiveMenuMsgId(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Cuộn đến tin nhắn gốc được trích dẫn và nháy sáng
  const scrollToOriginalMessage = useCallback((targetId) => {
    if (!targetId) return;
    const el = document.getElementById(`visitor-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetId);
      setTimeout(() => setHighlightedMsgId(null), 1500);
    }
  }, []);

  // Tự động đóng menu 3 chấm khi bấm ra ngoài
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuMsgId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Hủy trả lời bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setReplyingTo(null);
        setActiveMenuMsgId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tải lịch sử tin nhắn ban đầu
  const loadHistory = useCallback(async (targetSessionId) => {
    const activeSessionId = targetSessionId || getDirectChatSessionId();
    if (!activeSessionId) return;
    try {
      const history = await fetchChatHistory(activeSessionId);
      if (Array.isArray(history)) {
        setMessages(history);
        if (history.length > 0) {
          markChatAsRead(activeSessionId, false);

          // Nếu đã có tin nhắn từ khách và chưa từng hỏi email cho phiên này
          const promptKey = `direct_chat_email_prompt_${activeSessionId}`;
          if (!localStorage.getItem(promptKey) && history.some((m) => !m.isFromAdmin)) {
            setShowEmailPrompt(true);
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử chat:', err);
    }
  }, []);

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
      setSessionId(currentStoredSession);
      loadHistory(currentStoredSession);
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
        setMessages([]);
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
              (m.content === msg.content || (m.imageUrl && m.imageUrl === msg.imageUrl))
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
      const targetId = data?.sessionId || data?.SessionId || (typeof data === 'string' ? data : '');
      if (targetId && targetId === sessionId) {
        setIsSessionDeletedNotice(true);
        setMessages([]);
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

  // Xử lý gửi tin nhắn (kèm ảnh hoặc chỉ ảnh/chỉ text)
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if ((!text && !selectedImageFile) || loading || isUploadingImage) return;

    const currentName = userName.trim() || 'Khách truy cập';
    const targetReply = replyingTo;
    const currentImageFile = selectedImageFile;
    const currentPreview = imagePreviewUrl;

    setInput('');
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setReplyingTo(null);
    setActiveMenuMsgId(null);
    setLoading(true);

    let uploadedImageUrl = null;
    if (currentImageFile) {
      setIsUploadingImage(true);
      try {
        uploadedImageUrl = await uploadFile(currentImageFile);
      } catch (uploadErr) {
        console.error('Lỗi khi tải ảnh lên:', uploadErr);
        alert('Không thể tải ảnh lên. Vui lòng thử lại!');
        setLoading(false);
        setIsUploadingImage(false);
        setSelectedImageFile(currentImageFile);
        setImagePreviewUrl(currentPreview);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const finalContent = text || (uploadedImageUrl ? '[Hình ảnh]' : '');
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sessionId,
      senderName: currentName,
      content: finalContent,
      imageUrl: uploadedImageUrl,
      isFromAdmin: false,
      isReadByAdmin: false,
      isReadByUser: true,
      createdAt: new Date().toISOString(),
      replyToId: targetReply?.id || null,
      replyToSender: targetReply?.isFromAdmin ? 'Đức Nam' : 'chính bạn',
      replyToContent: targetReply?.content ? targetReply.content.substring(0, 150) : null
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      if (hubConnectionRef.current && isConnected) {
        const saved = await hubConnectionRef.current.invoke(
          'SendMessage',
          sessionId,
          currentName,
          finalContent,
          false,
          null,
          optimisticMsg.replyToId,
          optimisticMsg.replyToSender,
          optimisticMsg.replyToContent,
          uploadedImageUrl
        );
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage({
          sessionId,
          senderName: currentName,
          content: finalContent,
          imageUrl: uploadedImageUrl,
          isFromAdmin: false,
          replyToId: optimisticMsg.replyToId,
          replyToSender: optimisticMsg.replyToSender,
          replyToContent: optimisticMsg.replyToContent
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
          content: finalContent,
          imageUrl: uploadedImageUrl,
          isFromAdmin: false,
          replyToId: optimisticMsg.replyToId,
          replyToSender: optimisticMsg.replyToSender,
          replyToContent: optimisticMsg.replyToContent
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
    setReplyingTo(null);
    setActiveMenuMsgId(null);
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
            <VisitorChatMessageBubble
              msg={{
                id: 'welcome_greeting',
                sessionId,
                senderName: 'Vũ Đức Nam',
                content: `Xin chào ${userName}! 👋 Mình là Nam. Bạn có thể nhắn tin trực tiếp với mình tại đây về công việc, hợp tác hoặc câu hỏi bất kỳ, mình sẽ nhận được và phản hồi sớm nhé!`,
                isFromAdmin: true,
                createdAt: messages[0]?.createdAt || new Date().toISOString()
              }}
              heroAvatar={hero.avatar}
              onReply={handleInitiateReply}
              onScrollToMessage={scrollToOriginalMessage}
              onPreviewImage={setLightboxImage}
              isHighlighted={highlightedMsgId === 'welcome_greeting'}
              activeMenuId={activeMenuMsgId}
              setActiveMenuId={setActiveMenuMsgId}
            />

            {/* Các tin nhắn trong phiên */}
            {messages.map((msg, idx) => {
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

                  <VisitorChatMessageBubble
                    msg={msg}
                    heroAvatar={hero.avatar}
                    onReply={handleInitiateReply}
                    onScrollToMessage={scrollToOriginalMessage}
                    onPreviewImage={setLightboxImage}
                    isHighlighted={highlightedMsgId === msg.id}
                    activeMenuId={activeMenuMsgId}
                    setActiveMenuId={setActiveMenuMsgId}
                  />
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

          {/* Khung Xem Trước Tin Nhắn Đang Trả Lời (Reply Banner kiểu Messenger) */}
          {replyingTo && (
            <div className="mx-2.5 sm:mx-3 my-1 p-2 bg-[#161926] border border-[#F1D89E]/40 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2 duration-200 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded-lg bg-[#F1D89E]/20 text-[#F1D89E] flex items-center justify-center shrink-0">
                  <Reply className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[11px] font-bold text-[#F1D89E] flex items-center gap-1">
                    <span>Đang trả lời {replyingTo.isFromAdmin ? 'Đức Nam' : 'chính bạn'}</span>
                  </div>
                  <p className="text-[10.5px] text-gray-300 truncate font-normal leading-tight mt-0.5">
                    {replyingTo.content === '[Hình ảnh]' ? '📷 [Hình ảnh]' : replyingTo.content}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                title="Hủy trả lời (Esc)"
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Thanh xem trước ảnh chuẩn bị gửi */}
          {imagePreviewUrl && (
            <div className="mx-2.5 sm:mx-3 my-1 p-2 bg-[#161926] border border-[#F1D89E]/40 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2 duration-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                  <img
                    src={imagePreviewUrl}
                    alt="Xem trước ảnh"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-[#F1D89E] animate-spin" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[11px] font-bold text-[#F1D89E] flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Hình ảnh đính kèm</span>
                  </div>
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">
                    {selectedImageFile ? `${selectedImageFile.name} (${(selectedImageFile.size / 1024).toFixed(0)} KB)` : 'Ảnh từ clipboard'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveSelectedImage}
                disabled={isUploadingImage}
                title="Xóa ảnh đính kèm"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Ô NHẬP TIN NHẮN */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            onPaste={handlePaste}
            className="p-2.5 sm:p-3 bg-[#11131c] border-t border-white/10 flex gap-2 items-center shrink-0"
          >
            {/* Input file ẩn */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Nút đính kèm ảnh */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isUploadingImage}
              title="Gửi hình ảnh (hoặc dán Ctrl+V)"
              className="p-2 text-gray-400 hover:text-[#F1D89E] hover:bg-white/5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder={
                replyingTo
                  ? 'Nhập câu trả lời...'
                  : selectedImageFile
                  ? 'Thêm chú thích cho ảnh...'
                  : `Nhắn tin với tư cách "${userName}"...`
              }
              maxLength={1000}
              className="flex-1 bg-black/50 border border-white/10 focus:border-[#F1D89E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || isUploadingImage || (!input.trim() && !selectedImageFile)}
              className="bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-30 text-black p-2.5 rounded-xl transition font-bold shadow-md shadow-[#F1D89E]/20 cursor-pointer flex items-center justify-center shrink-0"
              title="Gửi tin nhắn"
            >
              {loading || isUploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </>
      )}

      {/* Lightbox Modal phóng to ảnh */}
      <ImageLightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
