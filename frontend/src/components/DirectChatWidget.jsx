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
  Loader2,
  RotateCcw,
  ChevronDown,
  Paperclip,
  FileText,
  Download,
  UploadCloud,
  File as FileGenericIcon
} from 'lucide-react';
import { PortfolioContext } from '../context/PortfolioContext';
import AdminAvatar from './AdminAvatar';
import { uploadFile, uploadChatAttachment } from '../utils/upload';
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
  getFullMediaUrl,
  recallChatMessage,
  updateVisitorName,
  formatFileSize
} from '../services/directChatService';

export function getFileMeta(fileName, fileType) {
  const name = fileName || 'file';
  const ext = (name.includes('.') ? name.split('.').pop() : (fileType || '')).toLowerCase();

  if (['pdf'].includes(ext)) {
    return { ext: 'PDF', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
  }
  if (['doc', 'docx'].includes(ext)) {
    return { ext: 'DOC', color: 'text-blue-400 bg-blue-500/15 border-blue-500/30' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return { ext: 'XLS', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return { ext: 'PPT', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return { ext: 'ZIP', color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' };
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return { ext: 'AUDIO', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' };
  }
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) {
    return { ext: 'VIDEO', color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' };
  }
  if (['json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'sql', 'py', 'cs', 'cpp', 'java', 'xml', 'md', 'txt'].includes(ext)) {
    return { ext: ext.toUpperCase(), color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' };
  }
  return { ext: ext.toUpperCase() || 'FILE', color: 'text-[#F1D89E] bg-[#F1D89E]/15 border-[#F1D89E]/30' };
}

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
  onRecall,
  onScrollToMessage,
  onPreviewImage,
  onImageLoad,
  isHighlighted,
  activeMenuId,
  setActiveMenuId
}) {
  const isMe = !msg.isFromAdmin;
  const isRecalled = Boolean(msg.isRecalled || msg.IsRecalled);
  const rawImageUrl = msg.imageUrl || msg.ImageUrl;
  const rawFileUrl = msg.fileUrl || msg.FileUrl;
  const effectiveFileUrl = isRecalled ? null : rawFileUrl;
  const isImageFile = Boolean(
    (msg.fileType && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(msg.fileType.toLowerCase())) ||
    (msg.fileName && /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(msg.fileName))
  );
  const isContentImageUrl =
    !isRecalled &&
    !rawImageUrl &&
    !rawFileUrl &&
    typeof msg.content === 'string' &&
    (msg.content.startsWith('http://') || msg.content.startsWith('https://') || msg.content.startsWith('/uploads/')) &&
    (msg.content.includes('res.cloudinary.com') ||
      msg.content.includes('/uploads/') ||
      /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(msg.content));
  const effectiveImageUrl = isRecalled ? null : (rawImageUrl || (isImageFile ? effectiveFileUrl : (isContentImageUrl ? msg.content : null)));
  const finalFileUrl = !isImageFile ? effectiveFileUrl : null;
  const fileMeta = finalFileUrl ? getFileMeta(msg.fileName, msg.fileType) : null;

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isScrollRef = useRef(false);
  const isHorizontalRef = useRef(false);

  // Nếu tin nhắn đã thu hồi, hiển thị giao diện thu hồi đơn giản, không cho tương tác vuốt/reply
  if (isRecalled) {
    return (
      <div id={`visitor-msg-${msg.id}`} className="relative my-1 select-text">
        <div className={`flex items-end gap-2 sm:gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {!isMe && (
            <div className="w-7 h-7 rounded-full border border-white/10 overflow-hidden shrink-0 mb-1 bg-black/40 opacity-60 shadow-sm">
              <AdminAvatar avatarUrl={heroAvatar} size={28} />
            </div>
          )}
          <div
            className={`max-w-[86%] sm:max-w-[72%] rounded-2xl px-3.5 py-2 text-xs border border-white/10 bg-white/[0.04] text-gray-400 italic shadow-sm flex flex-col gap-0.5 ${
              isMe ? 'rounded-tr-xs' : 'rounded-tl-xs'
            } ${isHighlighted ? 'ring-2 ring-[#F1D89E] scale-[1.02] duration-300' : ''}`}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-400 select-none">
              <RotateCcw className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>{isMe ? 'Bạn đã thu hồi một tin nhắn' : `${msg.senderName || 'Đức Nam'} đã thu hồi một tin nhắn`}</span>
            </div>
            <div className="text-[9.5px] text-gray-500 self-end">
              {formatMessageTime(msg.createdAt)}
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Nút 3 chấm (nằm bên trái nếu là tin nhắn của mình) */}
        {isMe && (
          <div className="relative flex items-center self-center opacity-70 md:opacity-0 group-hover/msg:opacity-100 transition">
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

            {/* Popover Menu */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 sm:right-full sm:mr-1.5 bottom-full mb-1.5 sm:bottom-0 z-30 w-32 bg-[#181b2a] border border-white/15 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuId(null);
                    onRecall && onRecall(msg);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 transition cursor-pointer border-t border-white/10"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Thu hồi</span>
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
                {msg.replyToContent === '[Hình ảnh]' ? '📷 [Hình ảnh]' : (msg.replyToContent.startsWith('[Tệp]') ? `📎 ${msg.replyToContent}` : msg.replyToContent)}
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
                alt={msg.fileName || 'Ảnh đính kèm'}
                className="max-w-full max-h-60 sm:max-h-80 rounded-xl object-cover block"
                loading="lazy"
                onLoad={onImageLoad}
              />
            </div>
          )}

          {/* Thẻ tệp đính kèm phong cách Zalo */}
          {finalFileUrl && (
            <a
              href={getFullMediaUrl(finalFileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              download={msg.fileName || 'file'}
              onClick={(e) => e.stopPropagation()}
              className={`my-1 p-2.5 rounded-xl border flex items-center gap-2.5 transition-all duration-200 group/file no-underline select-none ${
                isMe
                  ? 'bg-black/10 hover:bg-black/20 border-black/15 text-black'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-white'
              }`}
              title={`Tải về: ${msg.fileName || 'Tệp đính kèm'}`}
            >
              <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0 border font-extrabold text-[9px] tracking-wider shadow-sm transition-transform group-hover/file:scale-105 ${fileMeta.color}`}>
                <FileText className="w-4 h-4 mb-0.5" />
                <span className="leading-none text-[8px] truncate max-w-[32px]">{fileMeta.ext}</span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className={`text-xs font-bold truncate leading-tight ${
                  isMe ? 'text-black group-hover/file:underline' : 'text-gray-100 group-hover/file:text-[#F1D89E]'
                }`}>
                  {msg.fileName || 'Tệp đính kèm'}
                </div>
                <div className={`text-[10px] mt-0.5 font-medium ${isMe ? 'text-black/60' : 'text-gray-400'}`}>
                  {formatFileSize(msg.fileSize)}
                </div>
              </div>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                isMe
                  ? 'bg-black/10 text-black group-hover/file:bg-black group-hover/file:text-[#F1D89E]'
                  : 'bg-white/10 text-gray-300 group-hover/file:bg-[#F1D89E] group-hover/file:text-black border-white/10'
              }`}>
                <Download className="w-3.5 h-3.5 transition-transform group-hover/file:translate-y-0.5" />
              </div>
            </a>
          )}

          {/* Nội dung chính (chỉ hiển thị nếu có text khác [Hình ảnh] hoặc [Tệp] hoặc không có tệp/ảnh) */}
          {(() => {
            const isDefaultCaption = !msg.content || msg.content === '[Hình ảnh]' || (msg.fileName && msg.content === `[Tệp] ${msg.fileName}`) || msg.content === '[Tệp đính kèm]';
            if (isDefaultCaption && (effectiveImageUrl || finalFileUrl)) return null;
            if (!msg.content) return null;
            return (
              <div className="whitespace-pre-wrap break-words text-[13px] sm:text-xs leading-relaxed mt-0.5">{msg.content}</div>
            );
          })()}

          {/* Trạng thái đang tải lên */}
          {msg.isUploading && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-900 font-bold mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Đang gửi tệp...</span>
            </div>
          )}

          {/* Thời gian & Trạng thái đã xem */}
          <div
            className={`flex items-center justify-end gap-1 text-[9.5px] mt-1 ${
              isMe ? 'text-black/60' : 'text-gray-400'
            }`}
          >
            <span>{formatMessageTime(msg.createdAt)}</span>
            {isMe && !msg.isUploading && (
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

        {/* Nút 3 chấm (nằm bên phải nếu là tin nhắn của Nam) */}
        {!isMe && (
          <div className="relative flex items-center self-center opacity-70 md:opacity-0 group-hover/msg:opacity-100 transition">
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

            {/* Popover Menu */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 sm:left-full sm:ml-1.5 bottom-full mb-1.5 sm:bottom-0 z-30 w-32 bg-[#181b2a] border border-white/15 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
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

  // Trạng thái tệp đính kèm & phóng to ảnh
  const [pendingAttachment, setPendingAttachment] = useState(null); // { file, name, size, type, isImage, previewUrl }
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const fileInputRef = useRef(null);
  const generalFileInputRef = useRef(null);
  const inputFormRef = useRef(null);

  // Trạng thái Kéo & Thả Zalo Style
  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
  const [isDraggingOverInput, setIsDraggingOverInput] = useState(false);
  const chatDragCounterRef = useRef(0);
  const inputDragCounterRef = useRef(0);

  const validateFile = (file) => {
    if (!file) return false;
    const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.msi', '.dll', '.com', '.scr', '.jar', '.reg', '.pif'];
    const ext = file.name ? '.' + file.name.split('.').pop().toLowerCase() : '';
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      alert('Định dạng tệp này không được hỗ trợ vì lý do bảo mật!');
      return false;
    }
    if (file.size > 30 * 1024 * 1024) {
      alert('Dung lượng tệp tối đa là 30MB!');
      return false;
    }
    return true;
  };

  // Đính kèm tệp vào ô nhập tin nhắn (chưa gửi ngay, cho phép nhập lời nhắn kèm)
  const handleAttachPendingFile = (file) => {
    if (!validateFile(file)) return;
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    setPendingAttachment({
      file,
      name: file.name,
      size: file.size,
      type: file.type || (file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''),
      isImage,
      previewUrl
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleRemovePendingAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }
    setPendingAttachment(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAttachPendingFile(file);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleAttachPendingFile(file);
          break;
        }
      }
    }
  };

  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [hasNewUnreadWhileScrolled, setHasNewUnreadWhileScrolled] = useState(false);
  const hubConnectionRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const quickStarters = [
    '👋 Chào Nam!',
    '💼 Mình muốn trao đổi về cơ hội việc làm',
    '🚀 Mình quan tâm tới các dự án của Nam',
    '☕ Nam có đang rảnh để trò chuyện không?'
  ];

  const scrollToBottom = useCallback((smooth = true, force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!force && !isAtBottomRef.current) return;

    const targetTop = container.scrollHeight - container.clientHeight;
    if (targetTop <= 0) return;

    if (smooth) {
      container.scrollTo({ top: targetTop, behavior: 'smooth' });
    } else {
      container.scrollTop = targetTop;
    }
  }, []);

  const scrollImmediatelyToBottom = useCallback(() => {
    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setHasNewUnreadWhileScrolled(false);
    const container = messagesContainerRef.current;
    if (!container) return;

    const doScroll = () => {
      if (!container) return;
      container.scrollTop = container.scrollHeight - container.clientHeight;
    };

    doScroll();
    requestAnimationFrame(() => {
      doScroll();
      setTimeout(doScroll, 40);
      setTimeout(doScroll, 120);
      setTimeout(doScroll, 320);
    });
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isNearBottom = distanceToBottom < 90;
    isAtBottomRef.current = isNearBottom;
    setShowScrollBottomBtn(!isNearBottom);
    if (isNearBottom) {
      setHasNewUnreadWhileScrolled(false);
    }
  }, []);

  const handleImageLoad = useCallback(() => {
    if (isAtBottomRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight - container.clientHeight;
      }
    }
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
        scrollImmediatelyToBottom();
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
  }, [scrollImmediatelyToBottom]);

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
      scrollImmediatelyToBottom();
      loadHistory(currentStoredSession);
    }
  }, [isOpen, loadHistory, scrollImmediatelyToBottom]);

  useEffect(() => {
    if (isOpen && messages.length > 0 && isAtBottomRef.current) {
      scrollToBottom(false, true);
    }
  }, [isOpen, messages.length, scrollToBottom]);

  // Giữ khung chat luôn bám sát tin mới nhất khi nội dung thay đổi kích thước
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let prevHeight = container.scrollHeight;
    const observer = new ResizeObserver(() => {
      const currentHeight = container.scrollHeight;
      if (currentHeight !== prevHeight) {
        prevHeight = currentHeight;
        if (isAtBottomRef.current) {
          container.scrollTop = container.scrollHeight - container.clientHeight;
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
              (m.content === msg.content || (m.imageUrl && m.imageUrl === msg.imageUrl) || (m.fileName && m.fileName === msg.fileName))
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

        if (isAtBottomRef.current) {
          setTimeout(() => scrollToBottom(true, true), 40);
        } else {
          setHasNewUnreadWhileScrolled(true);
          setShowScrollBottomBtn(true);
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
          if (isAtBottomRef.current) {
            setTimeout(() => scrollToBottom(true, true), 40);
          }
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

    // Lắng nghe sự kiện thu hồi tin nhắn thời gian thực
    hub.on('MessageRecalled', (data) => {
      if (data && (data.sessionId === sessionId || !data.sessionId)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id
              ? {
                  ...m,
                  isRecalled: true,
                  content: data.content || '[Tin nhắn đã được thu hồi]',
                  imageUrl: null
                }
              : m
          )
        );
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

  // Xử lý thu hồi tin nhắn
  const handleRecallMessage = useCallback(
    async (msg) => {
      if (!msg || !msg.id) return;
      const confirmRecall = window.confirm('Bạn có chắc chắn muốn thu hồi tin nhắn này không?');
      if (!confirmRecall) return;

      setActiveMenuMsgId(null);

      // Cập nhật giao diện tức thì (Optimistic UI)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                isRecalled: true,
                content: '[Tin nhắn đã được thu hồi]',
                imageUrl: null
              }
            : m
        )
      );

      try {
        if (hubConnectionRef.current && hubConnectionRef.current.state === 'Connected') {
          await hubConnectionRef.current.invoke('RecallMessage', msg.id, sessionId, false);
        } else {
          await recallChatMessage(msg.id, sessionId, false);
        }
      } catch (err) {
        console.warn('SignalR recall failed, using REST fallback:', err);
        try {
          await recallChatMessage(msg.id, sessionId, false);
        } catch (restErr) {
          console.error('Lỗi khi thu hồi tin nhắn:', restErr);
        }
      }
    },
    [sessionId]
  );

  // Kéo thả trực tiếp vào đoạn chat: Tải lên và gửi ngay lập tức (phong cách Zalo)
  const handleSendFileDirectly = async (file) => {
    if (!validateFile(file) || loading || isUploadingAttachment) return;
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    const currentName = userName.trim() || 'Khách truy cập';
    const tempId = Date.now();
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    const defaultContent = isImage ? '[Hình ảnh]' : `[Tệp] ${file.name}`;

    const optimisticMsg = {
      id: tempId,
      sessionId,
      senderName: currentName,
      content: defaultContent,
      imageUrl: previewUrl,
      fileUrl: previewUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || (file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''),
      isUploading: true,
      isFromAdmin: false,
      isReadByAdmin: false,
      isReadByUser: true,
      createdAt: new Date().toISOString()
    };

    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setHasNewUnreadWhileScrolled(false);
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true, true);

    try {
      setIsUploadingAttachment(true);
      const uploadRes = await uploadChatAttachment(file);

      const payloadToSend = {
        sessionId,
        senderName: currentName,
        content: defaultContent,
        imageUrl: uploadRes.isImage ? uploadRes.url : null,
        fileUrl: uploadRes.url,
        fileName: uploadRes.fileName,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.fileType,
        isFromAdmin: false
      };

      if (hubConnectionRef.current && isConnected) {
        const saved = await hubConnectionRef.current.invoke(
          'SendMessage',
          sessionId,
          currentName,
          defaultContent,
          false,
          null,
          null,
          null,
          null,
          payloadToSend.imageUrl,
          payloadToSend.fileUrl,
          payloadToSend.fileName,
          payloadToSend.fileSize,
          payloadToSend.fileType
        );
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage(payloadToSend);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
      }
    } catch (err) {
      console.error('Lỗi khi gửi tệp trực tiếp:', err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Không thể tải tệp lên. Vui lòng thử lại!';
      alert(typeof errorMsg === 'string' ? errorMsg : 'Không thể tải tệp lên. Vui lòng thử lại!');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsUploadingAttachment(false);
      scrollToBottom(true, true);
    }
  };

  // Xử lý gửi tin nhắn (kèm tệp/ảnh hoặc chỉ tệp/chỉ text)
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if ((!text && !pendingAttachment) || loading || isUploadingAttachment) return;

    const currentName = userName.trim() || 'Khách truy cập';
    const targetReply = replyingTo;
    const currentAttachment = pendingAttachment;

    setInput('');
    setPendingAttachment(null);
    setReplyingTo(null);
    setActiveMenuMsgId(null);
    setLoading(true);

    let uploadRes = null;
    if (currentAttachment?.file) {
      setIsUploadingAttachment(true);
      try {
        uploadRes = await uploadChatAttachment(currentAttachment.file);
      } catch (uploadErr) {
        console.error('Lỗi khi tải tệp đính kèm lên:', uploadErr);
        const errorMsg = uploadErr.response?.data?.message || uploadErr.response?.data || uploadErr.message || 'Không thể tải tệp lên. Vui lòng thử lại!';
        alert(typeof errorMsg === 'string' ? errorMsg : 'Không thể tải tệp lên. Vui lòng thử lại!');
        setLoading(false);
        setIsUploadingAttachment(false);
        setPendingAttachment(currentAttachment);
        return;
      } finally {
        setIsUploadingAttachment(false);
      }
    }

    const isImage = uploadRes?.isImage;
    const finalContent = text || (uploadRes ? (isImage ? '[Hình ảnh]' : `[Tệp] ${uploadRes.fileName}`) : '');
    const tempId = Date.now();
    const optimisticMsg = {
      id: tempId,
      sessionId,
      senderName: currentName,
      content: finalContent,
      imageUrl: isImage ? uploadRes.url : null,
      fileUrl: uploadRes?.url || null,
      fileName: uploadRes?.fileName || null,
      fileSize: uploadRes?.fileSize || null,
      fileType: uploadRes?.fileType || null,
      isFromAdmin: false,
      isReadByAdmin: false,
      isReadByUser: true,
      createdAt: new Date().toISOString(),
      replyToId: targetReply?.id || null,
      replyToSender: targetReply?.isFromAdmin ? 'Đức Nam' : 'chính bạn',
      replyToContent: targetReply?.content ? targetReply.content.substring(0, 150) : null
    };

    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setHasNewUnreadWhileScrolled(false);
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true, true);
    setTimeout(() => scrollToBottom(true, true), 50);

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
          optimisticMsg.imageUrl,
          optimisticMsg.fileUrl,
          optimisticMsg.fileName,
          optimisticMsg.fileSize,
          optimisticMsg.fileType
        );
        if (saved) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        }
      } else {
        const saved = await sendChatMessage({
          sessionId,
          senderName: currentName,
          content: finalContent,
          imageUrl: optimisticMsg.imageUrl,
          fileUrl: optimisticMsg.fileUrl,
          fileName: optimisticMsg.fileName,
          fileSize: optimisticMsg.fileSize,
          fileType: optimisticMsg.fileType,
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
          imageUrl: optimisticMsg.imageUrl,
          fileUrl: optimisticMsg.fileUrl,
          fileName: optimisticMsg.fileName,
          fileSize: optimisticMsg.fileSize,
          fileType: optimisticMsg.fileType,
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
      scrollToBottom(true, true);

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

  const handleSaveName = async (e) => {
    e?.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setDirectChatUserName(trimmed);
    setIsEditingName(false);

    // Đồng bộ tức thì tên mới lên Server và gửi SignalR cho Admin
    try {
      if (hubConnectionRef.current && isConnected) {
        await hubConnectionRef.current.invoke('UpdateVisitorName', sessionId, trimmed);
      }
      await updateVisitorName(sessionId, trimmed);
    } catch (err) {
      console.warn('Lỗi khi đồng bộ tên mới lên server:', err);
    }
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
              onClick={() => {
                setInputName(userName);
                setIsEditingName(true);
              }}
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
          <div
            className="relative flex-1 min-h-0 flex flex-col"
            onDragEnter={(e) => {
              if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                chatDragCounterRef.current++;
                setIsDraggingOverChat(true);
              }
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              chatDragCounterRef.current--;
              if (chatDragCounterRef.current <= 0) {
                chatDragCounterRef.current = 0;
                setIsDraggingOverChat(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              chatDragCounterRef.current = 0;
              setIsDraggingOverChat(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleSendFileDirectly(files[0]);
              }
            }}
          >
            {/* OVERLAY THẢ FILE GỬI NGAY (ZALO STYLE) */}
            {isDraggingOverChat && (
              <div className="absolute inset-2 z-40 bg-[#0c0e18]/90 backdrop-blur-md border-2 border-dashed border-[#F1D89E] rounded-2xl flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-[0_0_30px_rgba(241,216,158,0.25)]">
                <div className="w-14 h-14 rounded-2xl bg-[#F1D89E]/20 text-[#F1D89E] flex items-center justify-center mb-2 shadow-lg animate-bounce">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="text-white text-sm font-bold tracking-wide">
                  Thả file vào đây để gửi ngay
                </h4>
                <p className="text-[11px] text-gray-300 mt-1">
                  Tệp sẽ được tải lên và gửi tự động tới cuộc trò chuyện
                </p>
              </div>
            )}

            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto overscroll-contain space-y-3 scrollbar-thin scrollbar-thumb-white/10"
            >
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
                onImageLoad={handleImageLoad}
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
                      onRecall={handleRecallMessage}
                      onScrollToMessage={scrollToOriginalMessage}
                      onPreviewImage={setLightboxImage}
                      onImageLoad={handleImageLoad}
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

            {/* Nút cuộn nhanh xuống tin nhắn mới nhất */}
            {showScrollBottomBtn && (
              <button
                type="button"
                onClick={() => {
                  isAtBottomRef.current = true;
                  setShowScrollBottomBtn(false);
                  setHasNewUnreadWhileScrolled(false);
                  scrollToBottom(true, true);
                }}
                className="absolute right-3.5 bottom-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181a26]/95 hover:bg-[#23273a] text-[#F1D89E] text-[11px] font-semibold border border-[#F1D89E]/35 shadow-[0_6px_20px_rgba(0,0,0,0.7)] backdrop-blur-md transition-all duration-200 animate-in fade-in zoom-in-90 cursor-pointer select-none"
                title="Cuộn xuống tin nhắn mới nhất"
              >
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                <span>{hasNewUnreadWhileScrolled ? 'Tin nhắn mới' : 'Mới nhất'}</span>
                {hasNewUnreadWhileScrolled && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>
            )}
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

          {/* Thanh xem trước tệp chuẩn bị gửi (kèm theo tin nhắn) */}
          {pendingAttachment && (
            <div className="mx-2.5 sm:mx-3 my-1 p-2 bg-[#161926] border border-[#F1D89E]/40 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-in slide-in-from-bottom-2 duration-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {pendingAttachment.isImage && pendingAttachment.previewUrl ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                    <img
                      src={pendingAttachment.previewUrl}
                      alt="Xem trước ảnh"
                      className="w-full h-full object-cover"
                    />
                    {isUploadingAttachment && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-[#F1D89E] animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 border font-extrabold text-[9px] tracking-wider shadow-sm ${getFileMeta(pendingAttachment.name, pendingAttachment.type).color}`}>
                    <FileText className="w-4 h-4 mb-0.5" />
                    <span className="leading-none text-[8px] truncate max-w-[34px]">{getFileMeta(pendingAttachment.name, pendingAttachment.type).ext}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[11px] font-bold text-[#F1D89E] flex items-center gap-1.5">
                    {pendingAttachment.isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <Paperclip className="w-3.5 h-3.5" />}
                    <span className="truncate">{pendingAttachment.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    {formatFileSize(pendingAttachment.size)} • Nhập tin nhắn phía dưới rồi bấm Gửi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemovePendingAttachment}
                disabled={isUploadingAttachment}
                title="Hủy đính kèm"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Ô NHẬP TIN NHẮN */}
          <form
            ref={inputFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            onPaste={handlePaste}
            onDragEnter={(e) => {
              if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                inputDragCounterRef.current++;
                setIsDraggingOverInput(true);
              }
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputDragCounterRef.current--;
              if (inputDragCounterRef.current <= 0) {
                inputDragCounterRef.current = 0;
                setIsDraggingOverInput(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputDragCounterRef.current = 0;
              setIsDraggingOverInput(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleAttachPendingFile(files[0]);
              }
            }}
            className={`p-2.5 sm:p-3 bg-[#11131c] border-t border-white/10 flex gap-2 items-center shrink-0 relative transition-colors ${
              isDraggingOverInput ? 'bg-[#1e2235] ring-2 ring-[#F1D89E]' : ''
            }`}
          >
            {/* OVERLAY KÉO THẢ VÀO Ô NHẬP TIN NHẮN (CHƯA GỬI NGAY, ĐÍNH KÈM ĐỂ GÕ THÊM TIN NHẮN) */}
            {isDraggingOverInput && (
              <div className="absolute inset-1 z-30 bg-[#151928]/95 border-2 border-dashed border-[#F1D89E] rounded-xl flex items-center justify-center gap-2 pointer-events-none animate-in fade-in duration-100">
                <Paperclip className="w-4 h-4 text-[#F1D89E] animate-pulse" />
                <span className="text-xs font-bold text-[#F1D89E]">
                  Thả vào đây để đính kèm & nhập tin nhắn kèm
                </span>
              </div>
            )}

            {/* Input file ẩn cho ảnh */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Input file ẩn cho mọi loại tệp */}
            <input
              ref={generalFileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Nút đính kèm tệp */}
            <button
              type="button"
              onClick={() => generalFileInputRef.current?.click()}
              disabled={loading || isUploadingAttachment}
              title="Đính kèm tệp (PDF, Word, Excel, ZIP, v.v.)"
              className="p-2 text-gray-400 hover:text-[#F1D89E] hover:bg-white/5 rounded-xl transition cursor-pointer shrink-0 disabled:opacity-30"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Nút đính kèm ảnh */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || isUploadingAttachment}
              title="Gửi hình ảnh"
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
                  : pendingAttachment
                  ? 'Thêm tin nhắn kèm cho tệp... (hoặc bấm Gửi)'
                  : `Nhắn tin với tư cách "${userName}"...`
              }
              maxLength={1000}
              className="flex-1 bg-black/50 border border-white/10 focus:border-[#F1D89E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={loading || isUploadingAttachment || (!input.trim() && !pendingAttachment)}
              className="bg-gradient-to-r from-[#F1D89E] to-[#d8b868] hover:opacity-90 disabled:opacity-30 text-black p-2.5 rounded-xl transition font-bold shadow-md shadow-[#F1D89E]/20 cursor-pointer flex items-center justify-center shrink-0"
              title="Gửi tin nhắn"
            >
              {loading || isUploadingAttachment ? (
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
