import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2, Heart, Send, User, MessageCircle, CornerDownRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { useAuth, ADMIN_API_KEY } from '../context/AuthContext';

// Helper: Tạo / Lấy tên ẩn danh từ localStorage
function getAnonymousName() {
  let name = localStorage.getItem('blog_anonymous_name');
  if (!name) {
    const rand = Math.floor(100 + Math.random() * 900);
    name = `Ẩn danh ${rand}`;
    localStorage.setItem('blog_anonymous_name', name);
  }
  return name;
}

// ==========================================
// SUB-COMPONENT: Form gửi bình luận / trả lời
// ==========================================
function CommentForm({ onSubmit, submitting, isAdmin, adminAvatar, placeholder, autoFocus }) {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const anonymousName = getAnonymousName();
  const displayName = isAdmin ? 'Đức Nam' : anonymousName;

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    await onSubmit(text.trim(), displayName);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden border border-[#F1D89E]/20 flex items-center justify-center bg-gradient-to-br from-[#F1D89E]/30 to-[#F1D89E]/10">
        {isAdmin && adminAvatar ? (
          <img src={adminAvatar} alt="Đức Nam" className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-[#F1D89E]/70" />
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="text-xs text-[#F1D89E]/50 mb-0.5">
          Bình luận với tên: <span className={`font-semibold ${isAdmin ? 'text-[#F1D89E]' : 'text-[#F1D89E]/80'}`}>{displayName}</span>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder || 'Viết bình luận...'}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#F1D89E]/40 focus:bg-white/[0.07] transition-all"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e8c86e] flex items-center justify-center text-black hover:shadow-[0_0_16px_rgba(241,216,158,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}

// ==========================================
// SUB-COMPONENT: Hiển thị 1 bình luận (có reply)
// ==========================================
function CommentItem({ comment, replies, isAdmin, adminAvatar, onReply, submitting }) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = async (text, name) => {
    await onReply(text, name, comment.id);
    setShowReplyForm(false);
  };

  const avatarContent = (c) => {
    if (c.isAdmin && adminAvatar) return <img src={adminAvatar} alt="Đức Nam" className="w-full h-full object-cover" />;
    if (c.isAdmin) return <span className="text-xs font-bold text-[#F1D89E]">ĐN</span>;
    return <span className="text-sm font-bold text-white/70">{c.tenNguoiDung?.charAt(c.tenNguoiDung.length - 1) || '?'}</span>;
  };

  const avatarBg = (c) =>
    c.isAdmin
      ? 'bg-gradient-to-br from-[#F1D89E]/40 to-amber-600/30 border-[#F1D89E]/40'
      : 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-white/10';

  return (
    <div className="comment-item-appear">
      {/* Comment gốc */}
      <div className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full border overflow-hidden flex items-center justify-center ${avatarBg(comment)}`}>
          {avatarContent(comment)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-sm font-semibold ${comment.isAdmin ? 'text-[#F1D89E]' : 'text-[#F1D89E]/80'}`}>
              {comment.tenNguoiDung}
              {comment.isAdmin && <span className="ml-1.5 text-[10px] bg-[#F1D89E]/20 text-[#F1D89E] px-1.5 py-0.5 rounded-full font-normal">Admin</span>}
            </span>
            <span className="text-xs text-gray-600 flex-shrink-0">
              {comment.ngayBinhLuan ? format(new Date(comment.ngayBinhLuan), 'dd/MM/yyyy HH:mm') : ''}
            </span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed break-words">{comment.noiDung}</p>
          {/* Nút trả lời */}
          <button
            onClick={() => setShowReplyForm((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-[#F1D89E]/70 transition-colors"
          >
            <CornerDownRight className="w-3 h-3" />
            {showReplyForm ? 'Huỷ' : 'Trả lời'}
          </button>
        </div>
      </div>

      {/* Form trả lời inline */}
      {showReplyForm && (
        <div className="ml-10 mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <CommentForm
            onSubmit={handleReply}
            submitting={submitting}
            isAdmin={isAdmin}
            adminAvatar={adminAvatar}
            placeholder={`Trả lời ${comment.tenNguoiDung}...`}
            autoFocus={true}
          />
        </div>
      )}

      {/* Danh sách replies */}
      {replies && replies.length > 0 && (
        <div className="ml-10 mt-2 space-y-2">
          {replies.map((r, i) => (
            <div key={r.id || i} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/10 transition-all">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full border overflow-hidden flex items-center justify-center text-xs ${avatarBg(r)}`}>
                {avatarContent(r)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-xs font-semibold ${r.isAdmin ? 'text-[#F1D89E]' : 'text-[#F1D89E]/80'}`}>
                    {r.tenNguoiDung}
                    {r.isAdmin && <span className="ml-1.5 text-[9px] bg-[#F1D89E]/20 text-[#F1D89E] px-1 py-0.5 rounded-full font-normal">Admin</span>}
                  </span>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">
                    {r.ngayBinhLuan ? format(new Date(r.ngayBinhLuan), 'dd/MM/yyyy HH:mm') : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed break-words">{r.noiDung}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT: Full Comment Section (Detail Page)
// ==========================================
function DetailCommentSection({ postId }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState(null);

  // Lấy avatar admin từ portfolio config
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/config`);
        const data = res.data;
        // Tìm avatar trong các field phổ biến
        const avatar =
          data?.hero?.avatar ||
          data?.about?.avatar ||
          data?.hero?.image ||
          data?.about?.image ||
          null;
        if (avatar) setAdminAvatar(avatar);
      } catch (_) {}
    };
    fetchAvatar();
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/comments/bypost/${postId}`);
      setComments(res.data);
    } catch (err) {
      console.error('Lỗi tải bình luận:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Tổ chức comments thành cây: parents + replies của từng parent
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {});

  const handleSubmitRoot = async (text, name) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/comments`, {
        maBaiViet: postId,
        tenNguoiDung: name,
        noiDung: text,
        isAdmin: isAdmin,
      });
      setComments((prev) => [...prev, res.data]);
    } catch (err) {
      console.error('Lỗi gửi bình luận:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (text, name, parentId) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/comments`, {
        maBaiViet: postId,
        tenNguoiDung: name,
        noiDung: text,
        parentId: parentId,
        isAdmin: isAdmin,
      });
      setComments((prev) => [...prev, res.data]);
    } catch (err) {
      console.error('Lỗi gửi reply:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCount = comments.length;

  return (
    <div className="mt-10 md:mt-14 border-t border-white/10 pt-8">
      {/* Header */}
      <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-[#F1D89E]" />
        {t('detail.comments', 'Bình luận')}
        <span className="text-sm font-normal text-gray-400">({totalCount})</span>
      </h3>

      {/* Form nhập bình luận gốc */}
      <div className="mb-8">
        <CommentForm
          onSubmit={handleSubmitRoot}
          submitting={submitting}
          isAdmin={isAdmin}
          adminAvatar={adminAvatar}
          placeholder={t('blog.commentPlaceholder', 'Viết bình luận...')}
        />
      </div>

      {/* Danh sách tất cả bình luận */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-6">
            {t('blog.loadingComments', 'Đang tải bình luận...')}
          </p>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-10">
            <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {t('blog.noComments', 'Chưa có bình luận nào. Hãy là người đầu tiên! 💬')}
            </p>
          </div>
        ) : (
          // Hiển thị từ mới nhất xuống cũ nhất (đảo ngược rootComments)
          [...rootComments].reverse().map((c, idx) => (
            <CommentItem
              key={c.id || idx}
              comment={c}
              replies={repliesMap[c.id] || []}
              isAdmin={isAdmin}
              adminAvatar={adminAvatar}
              onReply={handleReply}
              submitting={submitting}
            />
          ))
        )}
      </div>
    </div>
  );
}


// ==========================================
// COMPONENT: Heart Button for Detail Page
// ==========================================
function DetailHeartButton({ postId, initialLikes }) {
  const { t } = useTranslation();
  const [likes, setLikes] = useState(initialLikes || 0);
  const [isLiked, setIsLiked] = useState(() => {
    return localStorage.getItem(`blog_liked_${postId}`) === 'true';
  });
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (initialLikes !== undefined && initialLikes !== null) {
      setLikes(initialLikes);
    }
  }, [initialLikes]);

  const handleLike = async () => {
    setLikes((prev) => prev + 1);
    setIsLiked(true);
    localStorage.setItem(`blog_liked_${postId}`, 'true');
    setBouncing(true);
    setTimeout(() => setBouncing(false), 450);

    try {
      const res = await axios.patch(`${API_BASE_URL}/api/posts/${postId}/like`);
      setLikes(res.data.luotTim);
    } catch (err) {
      console.error('Lỗi like:', err);
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
        ${isLiked
          ? 'bg-red-500/10 border border-red-500/30 text-red-400'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5'
        }`}
      style={{ filter: isLiked ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'none' }}
    >
      <span className={bouncing ? 'heart-bounce' : ''}>
        <Heart
          className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
        />
      </span>
      <span className="text-sm font-medium tabular-nums">{likes}</span>
      <span className="text-xs text-gray-500 hidden sm:inline">{t('detail.likes', 'lượt thích')}</span>
    </button>
  );
}

// ==========================================
// MAIN COMPONENT: Detail
// ==========================================
export default function Detail() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/posts/${id}`);
        setPost(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetail();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm(t('detail.deleteConfirm', "Hành động này sẽ xóa vĩnh viễn dữ liệu. Tiếp tục?"))) {
      try {
        await axios.delete(`${API_BASE_URL}/api/posts/${id}`, {
          headers: { 'X-Admin-Key': ADMIN_API_KEY }
        });
        navigate("/");
      } catch(e) {
        alert(t('detail.deleteError', "Lỗi khi xóa bài"));
      }
    }
  };

  if (!post) return <div className="text-center mt-20 text-xl font-light">{t('detail.loading', 'Đang tải bài viết...')}</div>;

  return (
    <div className="max-w-3xl mx-auto glass rounded-2xl md:rounded-3xl p-5 md:p-12 bg-black/60 shadow-2xl">
      <Link to="/" className="inline-flex items-center text-[#F1D89E] hover:text-white mb-6 md:mb-8 transition-colors text-sm md:text-base">
        <ArrowLeft className="w-5 h-5 mr-2" /> {t('detail.backToHome', 'Trở về Trang Chủ')}
      </Link>
      
      {post.hinhAnhBia && (
        <div className="w-full max-h-[450px] md:max-h-[600px] mb-6 md:mb-10 rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(241,216,158,0.1)] overflow-hidden border border-white/10 relative flex items-center justify-center bg-black/80">
          {/* Lớp nền làm mờ cho ảnh tỷ lệ dọc (Cinematic Blur) */}
          <div 
             className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-125" 
             style={{ backgroundImage: `url(${post.hinhAnhBia.startsWith('http') ? post.hinhAnhBia : `${API_BASE_URL}${post.hinhAnhBia.startsWith('/') ? '' : '/'}${post.hinhAnhBia}`})` }}
          />
          {/* Ảnh chính giữ nguyên tỷ lệ */}
          <img 
              src={post.hinhAnhBia.startsWith('http') ? post.hinhAnhBia : `${API_BASE_URL}${post.hinhAnhBia.startsWith('/') ? '' : '/'}${post.hinhAnhBia}`} 
              alt={post.tieuDe} 
              className="relative z-10 w-full h-full max-h-[450px] md:max-h-[600px] object-contain hover:scale-[1.02] transition-transform duration-700" 
          />
        </div>
      )}

      {post.theLoai && (
        <span className="inline-block px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-widest text-[#F1D89E] bg-[#F1D89E]/10 border border-[#F1D89E]/30 rounded-full">
          {post.theLoai}
        </span>
      )}

      <h1 className="text-2xl md:text-5xl font-extrabold mb-3 md:mb-4 text-white leading-tight">
        {post.tieuDe}
      </h1>

      {post.tomTat && (
        <p className="text-base md:text-xl text-gray-300 italic mb-6 md:mb-8 border-l-4 border-[#F1D89E] pl-4 md:pl-6 py-2 leading-relaxed">
          {post.tomTat}
        </p>
      )}
      
      <div className="flex max-md:flex-col justify-between items-start md:items-center border-b border-white/20 pb-4 md:pb-6 mb-6 md:mb-8 text-[#F1D89E]/60 text-xs md:text-sm gap-3 md:gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span>{t('detail.postedOn', 'Ngày đăng:')} {format(new Date(post.ngayDang), 'dd/MM/yyyy HH:mm')}</span>
          <DetailHeartButton postId={post.maBaiViet} initialLikes={post.luotTim || 0} />
        </div>
        
        {isAdmin && (
          <div className="flex gap-4 border border-white/10 px-4 py-2 rounded-full glass">
            <button onClick={() => navigate(`/admin/edit/${post.maBaiViet}`)} className="flex items-center hover:text-blue-400 transition-colors">
              <Edit className="w-4 h-4 mr-2"/> {t('detail.edit', 'Sửa')}
            </button>
            <button onClick={handleDelete} className="flex items-center hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4 mr-2"/> {t('detail.delete', 'Xóa')}
            </button>
          </div>
        )}
      </div>

      <div 
        className="prose prose-invert prose-sm md:prose-lg max-w-none text-gray-200 leading-relaxed font-light"
        dangerouslySetInnerHTML={{ __html: post.noiDung }} 
      />

      {/* ===== Full Comment Section ===== */}
      <DetailCommentSection postId={post.maBaiViet} />
    </div>
  );
}
