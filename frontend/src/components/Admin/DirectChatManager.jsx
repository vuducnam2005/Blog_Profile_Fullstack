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
  MessageCircle,
  Reply,
  MoreHorizontal,
  Copy,
  X,
  Mail,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { PortfolioContext } from '../../context/PortfolioContext';
import AdminAvatar from '../AdminAvatar';
import { uploadFile } from '../../utils/upload';
import {
  createChatHubConnection,
  fetchAdminSessions,
  fetchChatHistory,
  sendChatMessage,
  markChatAsRead,
  deleteAdminSession,
  playNotificationSound,
  formatMessageTime,
  formatSessionTime,
  formatDateDivider,
  isSameDay,
  fetchAdminNotificationSetting,
  updateAdminNotificationSetting,
  getFullMediaUrl
} from '../../services/directChatService';
import { ADMIN_API_KEY } from '../../context/AuthContext';

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

function ChatMessageBubble({
  msg,
  isNam,
  heroAvatar,
  onReply,
  onScrollToMessage,
  onPreviewImage,
  isHighlighted,
  activeMenuId,
  setActiveMenuId
}) {
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
      id={`msg-${msg.id}`}
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
        className={`flex items-end gap-2 sm:gap-2.5 ${isNam ? 'justify-end' : 'justify-start'}`}
      >
        {/* Avatar Khách */}
        {!isNam && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0 mb-1">
            {msg.senderName?.charAt(0)?.toUpperCase() || 'K'}
          </div>
        )}

        {/* Nút 3 chấm trên Desktop (nằm bên trái nếu là tin nhắn của Nam) */}
        {isNam && (
          <div className="relative hidden md:flex items-center self-center opacity-0 group-hover/msg:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : msg.id);
              }}
              title="Tùy chọn tin nhắn"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
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
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-[#F1D89E] hover:bg-white/10 flex items-center gap-2 transition"
                >
                  <Reply className="w-3.5 h-3.5 text-[#F1D89E]" />
                  <span>Trả lời</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
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
            isNam
              ? 'bg-gradient-to-r from-[#F1D89E] to-[#d8ba70] text-black font-medium rounded-tr-xs'
              : 'bg-[#181b2a] text-gray-100 border border-white/10 rounded-tl-xs'
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
                isNam
                  ? 'bg-white/50 hover:bg-white/65 border-l-[3px] border-amber-900/80 shadow-xs'
                  : 'bg-white/[0.08] hover:bg-white/[0.13] border-l-[3px] border-[#F1D89E] shadow-xs'
              }`}
              title="Bấm để cuộn đến tin nhắn gốc"
            >
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
                <Reply className={`w-3 h-3 shrink-0 ${isNam ? 'text-amber-950' : 'text-[#F1D89E]'}`} />
                <span className={`truncate ${isNam ? 'text-amber-950' : 'text-[#F1D89E]'}`}>
                  {msg.replyToSender ? `Trả lời ${msg.replyToSender}` : 'Trả lời tin nhắn'}
                </span>
              </div>
              <p className={`text-[11px] truncate max-w-full leading-tight mt-0.5 font-normal ${isNam ? 'text-stone-900' : 'text-gray-300'}`}>
                {msg.replyToContent === '[Hình ảnh]' ? '📷 [Hình ảnh]' : msg.replyToContent}
              </p>
            </div>
          )}

          {/* Hình ảnh đính kèm */}
          {msg.imageUrl && (
            <div className="mb-1 rounded-xl overflow-hidden cursor-pointer group/img relative">
              <img
                src={getFullMediaUrl(msg.imageUrl)}
                alt="Ảnh đính kèm"
                className="max-w-full max-h-60 sm:max-h-72 rounded-xl object-cover hover:opacity-90 transition shadow-sm block"
                loading="lazy"
                onClick={() => onPreviewImage && onPreviewImage(getFullMediaUrl(msg.imageUrl))}
              />
            </div>
          )}

          {/* Nội dung chính (chỉ hiển thị nếu có text khác [Hình ảnh] hoặc không có ảnh) */}
          {(!msg.imageUrl || msg.content !== '[Hình ảnh]') && (
            <div className="whitespace-pre-wrap break-words text-[13px] sm:text-xs leading-relaxed">{msg.content}</div>
          )}

          {/* Thời gian & Trạng thái đã xem */}
          <div
            className={`flex items-center justify-end gap-1 text-[9.5px] mt-1 ${
              isNam ? 'text-black/60' : 'text-gray-400'
            }`}
          >
            <span>{formatMessageTime(msg.createdAt)}</span>
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

        {/* Nút 3 chấm trên Desktop (nằm bên phải nếu là tin nhắn của Khách) */}
        {!isNam && (
          <div className="relative hidden md:flex items-center self-center opacity-0 group-hover/msg:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(isMenuOpen ? null : msg.id);
              }}
              title="Tùy chọn tin nhắn"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
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
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-[#F1D89E] hover:bg-white/10 flex items-center gap-2 transition"
                >
                  <Reply className="w-3.5 h-3.5 text-[#F1D89E]" />
                  <span>Trả lời</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-xs text-left text-gray-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition"
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

export default function DirectChatManager() {
  const { data } = useContext(PortfolioContext);
  const hero = data?.hero || {};

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

  // Trạng thái bật/tắt nhận thông báo qua email cho Admin
  const [emailNotificationEnabled, setEmailNotificationEnabled] = useState(true);
  const [updatingEmailSetting, setUpdatingEmailSetting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Trạng thái trả lời tin nhắn kiểu Messenger
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);

  // Trạng thái gửi ảnh & phóng to ảnh cho Admin
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

  // Lấy trạng thái cài đặt thông báo email khi mở trang
  useEffect(() => {
    let isMounted = true;
    fetchAdminNotificationSetting().then((data) => {
      if (isMounted && data && typeof data.emailNotificationEnabled === 'boolean') {
        setEmailNotificationEnabled(data.emailNotificationEnabled);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSessionRef = useRef(activeSessionId);
  const chatEndRef = useRef(null);
  const hubRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

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
              (m.content === msg.content || (m.imageUrl && m.imageUrl === msg.imageUrl))
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

    hub.on('AdminEmailNotificationSettingChanged', (data) => {
      if (data && typeof data.emailNotificationEnabled === 'boolean') {
        setEmailNotificationEnabled(data.emailNotificationEnabled);
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
    const el = document.getElementById(`msg-${targetId}`);
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

  // Xử lý bật/tắt nhận thông báo qua email khi có khách nhắn tin
  const handleToggleEmailNotification = async () => {
    if (updatingEmailSetting) return;
    const nextVal = !emailNotificationEnabled;
    setEmailNotificationEnabled(nextVal);
    setUpdatingEmailSetting(true);

    try {
      await updateAdminNotificationSetting(nextVal);
      setToastMessage(
        nextVal
          ? 'Đã BẬT thông báo qua email khi có khách nhắn tin.'
          : 'Đã TẮT thông báo qua email (chống spam hòm thư).'
      );
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Lỗi khi cập nhật cài đặt thông báo email:', err);
      setEmailNotificationEnabled(!nextVal); // rollback
      alert('Không thể lưu cài đặt thông báo email. Vui lòng thử lại!');
    } finally {
      setUpdatingEmailSetting(false);
    }
  };

  // Xử lý chọn hội thoại
  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setReplyingTo(null);
    setActiveMenuMsgId(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setMobileView('chat');
  };

  // Xử lý gửi tin nhắn từ Admin (Đức Nam)
  const handleSendReply = async (e) => {
    e?.preventDefault();
    const text = replyText.trim();
    if ((!text && !selectedImageFile) || !activeSessionId || sending || isUploadingImage) return;

    setSending(true);
    setReplyText('');
    const targetReply = replyingTo;
    const currentImageFile = selectedImageFile;
    const currentPreview = imagePreviewUrl;

    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setReplyingTo(null);

    let uploadedImageUrl = null;
    if (currentImageFile) {
      setIsUploadingImage(true);
      try {
        uploadedImageUrl = await uploadFile(currentImageFile);
      } catch (uploadErr) {
        console.error('Lỗi khi Admin tải ảnh lên:', uploadErr);
        alert('Không thể tải ảnh lên. Vui lòng thử lại!');
        setSending(false);
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
      sessionId: activeSessionId,
      senderName: 'Đức Nam',
      content: finalContent,
      imageUrl: uploadedImageUrl,
      isFromAdmin: true,
      isReadByAdmin: true,
      isReadByUser: false,
      createdAt: new Date().toISOString(),
      replyToId: targetReply?.id || null,
      replyToSender: targetReply?.isFromAdmin ? 'chính bạn' : (targetReply?.senderName || 'Khách'),
      replyToContent: targetReply?.content ? targetReply.content.substring(0, 150) : null
    };

    setActiveMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      if (hubRef.current) {
        const saved = await hubRef.current.invoke(
          'SendMessage',
          activeSessionId,
          'Đức Nam',
          finalContent,
          true,
          ADMIN_API_KEY,
          optimisticMsg.replyToId,
          optimisticMsg.replyToSender,
          optimisticMsg.replyToContent,
          uploadedImageUrl
        );
        if (saved) {
          setActiveMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage({
          sessionId: activeSessionId,
          senderName: 'Đức Nam',
          content: finalContent,
          imageUrl: uploadedImageUrl,
          isFromAdmin: true,
          replyToId: optimisticMsg.replyToId,
          replyToSender: optimisticMsg.replyToSender,
          replyToContent: optimisticMsg.replyToContent
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
          content: finalContent,
          imageUrl: uploadedImageUrl,
          isFromAdmin: true,
          replyToId: optimisticMsg.replyToId,
          replyToSender: optimisticMsg.replyToSender,
          replyToContent: optimisticMsg.replyToContent
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
      if (hubRef.current) {
        await hubRef.current.invoke('DeleteSession', sessionId, ADMIN_API_KEY);
      } else {
        await deleteAdminSession(sessionId);
      }
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveMessages([]);
        setMobileView('list');
      }
    } catch (err) {
      console.warn('SignalR delete failed, fallback to REST:', err);
      try {
        await deleteAdminSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setActiveMessages([]);
          setMobileView('list');
        }
      } catch (fallbackErr) {
        alert('Lỗi khi xóa hội thoại! Vui lòng thử lại.');
        console.error(fallbackErr);
      }
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
    <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 pt-0 pb-2 sm:pb-6 relative">
      {/* Toast thông báo khi bật/tắt thành công */}
      {toastMessage && (
        <div className="fixed top-20 right-4 sm:right-8 z-[100] px-4 py-2.5 rounded-2xl bg-[#0c0e18]/95 border border-[#F1D89E]/40 shadow-2xl text-xs sm:text-sm font-medium text-white flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* THANH ĐIỀU KHIỂN ĐỈNH TRANG & BẬT/TẮT THÔNG BÁO EMAIL CHO ADMIN */}
      <div className="mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2 px-1 sm:px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F1D89E]/20 to-amber-500/10 border border-[#F1D89E]/40 flex items-center justify-center text-[#F1D89E] shadow-sm">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-white text-xs sm:text-sm font-bold flex items-center gap-2 leading-tight">
              <span>Tin Nhắn Khách Trực Tiếp</span>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse shadow-md">
                  {totalUnread} tin mới
                </span>
              )}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-gray-400">
              {sessions.length} cuộc hội thoại đang lưu trữ
            </p>
          </div>
        </div>

        {/* Nút Bật/Tắt Nhận Thông Báo Qua Mail */}
        <button
          type="button"
          onClick={handleToggleEmailNotification}
          disabled={updatingEmailSetting}
          title={
            emailNotificationEnabled
              ? 'Thông báo Email đang BẬT. Khi có khách nhắn tin, hệ thống sẽ gửi mail cho bạn. Bấm để TẮT.'
              : 'Thông báo Email đang TẮT. Tránh tình trạng hòm thư nhận quá nhiều thông báo. Bấm để BẬT.'
          }
          className={`group relative flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl border transition-all duration-200 cursor-pointer shadow-lg active:scale-95 select-none ${
            emailNotificationEnabled
              ? 'bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-teal-950/60 border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-gray-400 hover:text-gray-200'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
              emailNotificationEnabled
                ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-white/5 text-gray-400'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[11px] sm:text-xs font-semibold">
                Thông báo qua Mail:
              </span>
              <span
                className={`text-[11px] sm:text-xs font-black tracking-wide uppercase ${
                  emailNotificationEnabled ? 'text-emerald-400' : 'text-gray-400'
                }`}
              >
                {emailNotificationEnabled ? 'BẬT' : 'TẮT'}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5 hidden sm:inline">
              {emailNotificationEnabled
                ? 'Gửi mail khi có khách nhắn'
                : 'Không gửi mail (chống spam)'}
            </span>
          </div>

          {/* Toggle Switch Visual */}
          <div
            className={`w-8 h-4.5 sm:w-9 sm:h-5 rounded-full transition-colors flex items-center p-0.5 ml-1 border ${
              emailNotificationEnabled
                ? 'bg-emerald-500 border-emerald-400 justify-end'
                : 'bg-gray-700/80 border-gray-600 justify-start'
            }`}
          >
            <div
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-white shadow-md transform transition-transform ${
                updatingEmailSetting ? 'animate-spin' : ''
              }`}
            />
          </div>
        </button>
      </div>

      <div className="bg-[#0b0d14] border border-white/15 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[calc(100dvh-150px)] sm:h-[calc(100dvh-175px)] md:h-[720px] min-h-[460px] max-h-[850px]">
        
        {/* ======================================================== */}
        {/* CỘT TRÁI: DANH SÁCH HỘI THOẠI (SESSIONS LIST) */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-80 lg:w-96 h-full flex-1 md:flex-initial shrink-0 flex flex-col border-r border-white/10 bg-[#0d0f18] ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header Danh Sách */}
          <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
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

          {/* Gợi ý thao tác trên mobile */}
          <div className="md:hidden px-3.5 py-1.5 bg-[#F1D89E]/10 border-b border-[#F1D89E]/20 text-[11px] text-[#F1D89E] flex items-center gap-1.5 font-medium shrink-0">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Chạm vào hội thoại hoặc nút Trả lời để phản hồi</span>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="p-3 border-b border-white/5 shrink-0">
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
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 touch-pan-y">
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
                    className={`p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-[#F1D89E]/15 border-l-4 border-l-[#F1D89E]'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {/* Avatar Ký Tự Khách */}
                    <div className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/15 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
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
                          {formatSessionTime(session.lastMessageTime)}
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
                        {session.lastMessage === '[Hình ảnh]' ? (
                          <span className="inline-flex items-center gap-1 text-[#F1D89E]">
                            <ImageIcon className="w-3 h-3" /> [Hình ảnh]
                          </span>
                        ) : (
                          session.lastMessage || '...'
                        )}
                      </p>
                    </div>

                    {/* Nút Trả Lời & Xóa */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSession(session.sessionId);
                        }}
                        className="md:hidden px-2.5 py-1.5 bg-[#F1D89E] text-black font-bold rounded-lg text-xs flex items-center gap-1 shadow-md shadow-[#F1D89E]/20 active:scale-95 transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Trả lời</span>
                      </button>
                      <button
                        onClick={(e) => handleDeleteSession(session.sessionId, e)}
                        title="Xóa cuộc trò chuyện này"
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition shrink-0 opacity-80 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          className={`flex-1 min-w-0 h-full flex flex-col bg-[#0b0c14] ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeSessionId ? (
            <>
              {/* Header Khung Chat */}
              <div className="p-3 sm:p-4 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden px-2.5 py-1.5 text-[#F1D89E] hover:text-white rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 transition shrink-0"
                    title="Quay lại danh sách hội thoại"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-bold">Danh sách</span>
                  </button>

                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/20 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md shrink-0">
                    {activeSessionData?.senderName?.charAt(0)?.toUpperCase() || 'K'}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 truncate">
                      <span className="truncate">{activeSessionData?.senderName || 'Khách truy cập'}</span>
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] sm:text-[10px] border border-emerald-500/30 font-normal shrink-0">
                        Trực tuyến
                      </span>
                    </h3>
                    <p className="text-[9px] sm:text-[10px] text-gray-400 truncate">
                      Mã: <span className="font-mono text-gray-300">{activeSessionId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDeleteSession(activeSessionId, e)}
                    title="Xóa toàn bộ tin nhắn cuộc trò chuyện này"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 rounded-xl transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa hội thoại</span>
                  </button>
                </div>
              </div>

              {/* Danh Sách Tin Nhắn Của Phiên */}
              <div className="flex-1 min-h-0 p-3 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 scrollbar-thin scrollbar-thumb-white/10 touch-pan-y">
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
                    const prevMsg = idx > 0 ? activeMessages[idx - 1] : null;
                    const isNewDay = !prevMsg || !isSameDay(msg.createdAt, prevMsg.createdAt);

                    return (
                      <div key={msg.id || idx}>
                        {/* Dải phân cách ngày nhắn */}
                        {isNewDay && (
                          <div className="flex justify-center my-3 select-none">
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#F1D89E] text-[10px] font-semibold tracking-wider shadow-sm">
                              {formatDateDivider(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        <ChatMessageBubble
                          msg={msg}
                          isNam={isNam}
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
              <div className="px-3 sm:px-4 py-2 bg-black/30 border-t border-white/5 flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none touch-pan-x shrink-0">
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

              {/* Khung Xem Trước Tin Nhắn Đang Trả Lời (Reply Banner kiểu Messenger) */}
              {replyingTo && (
                <div className="mx-2.5 sm:mx-3.5 mt-2 p-2 sm:p-2.5 bg-[#141724] border border-[#F1D89E]/40 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2 duration-200 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-[#F1D89E]/20 text-[#F1D89E] flex items-center justify-center shrink-0">
                      <Reply className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-[11px] font-bold text-[#F1D89E] flex items-center gap-1">
                        <span>Đang trả lời {replyingTo.isFromAdmin ? 'chính bạn' : (replyingTo.senderName || 'khách')}</span>
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
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Thanh xem trước ảnh chuẩn bị gửi */}
              {imagePreviewUrl && (
                <div className="mx-2.5 sm:mx-3.5 mt-2 p-2 sm:p-2.5 bg-[#141724] border border-[#F1D89E]/40 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2 duration-200 shrink-0">
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

              {/* Khung Soạn Tin Nhắn Trả Lời Của Nam */}
              <form
                onSubmit={handleSendReply}
                onPaste={handlePaste}
                className="p-2.5 sm:p-3.5 bg-[#0d0f18] border-t border-white/10 flex gap-2 sm:gap-2.5 items-center shrink-0"
              >
                <div className="w-8 h-8 rounded-full border border-[#F1D89E]/40 overflow-hidden shrink-0 hidden sm:block bg-black/40 shadow-sm">
                  <AdminAvatar avatarUrl={hero.avatar} size={32} />
                </div>

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
                  disabled={sending || isUploadingImage}
                  title="Gửi hình ảnh (hoặc dán Ctrl+V)"
                  className="p-2 text-gray-400 hover:text-[#F1D89E] hover:bg-white/5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30"
                >
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={replyText}
                  onChange={handleAdminTyping}
                  placeholder={
                    replyingTo
                      ? `Trả lời ${replyingTo.isFromAdmin ? 'chính bạn' : replyingTo.senderName || 'khách'}...`
                      : selectedImageFile
                      ? 'Thêm chú thích cho ảnh (hoặc bấm Gửi)...'
                      : `Trả lời ${activeSessionData?.senderName || 'khách'} với tên Đức Nam...`
                  }
                  maxLength={1000}
                  className="flex-1 min-w-0 bg-white/5 border border-white/15 focus:border-[#F1D89E] rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none transition"
                />

                <button
                  type="submit"
                  disabled={sending || isUploadingImage || (!replyText.trim() && !selectedImageFile)}
                  className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-[#F1D89E]/20 shrink-0 min-w-[70px]"
                >
                  {sending || isUploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="font-bold">Gửi</span>
                    </>
                  )}
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

      {/* Lightbox Modal phóng to ảnh */}
      <ImageLightboxModal imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
    </div>
  );
}
