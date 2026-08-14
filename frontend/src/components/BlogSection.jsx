import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Heart, MessageCircle, Send, User, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import OptimizedImage from './OptimizedImage';
import { formatDateTime } from '../utils/dateTime';

// ==========================================
// HELPER: Tạo / Lấy tên ẩn danh từ localStorage
// ==========================================
function getAnonymousName() {
  let name = localStorage.getItem('blog_anonymous_name');
  if (!name) {
    const rand = Math.floor(100 + Math.random() * 900); // 3 chữ số: 100-999
    name = `Ẩn danh ${rand}`;
    localStorage.setItem('blog_anonymous_name', name);
  }
  return name;
}

// ==========================================
// COMPONENT: Floating Hearts Effect
// ==========================================
function FloatingHearts({ hearts }) {
  return hearts.map((heart) => (
    <span
      key={heart.id}
      className="floating-heart"
      style={{
        left: heart.x,
        top: heart.y,
        '--heart-x': `${heart.dx1}px`,
        '--heart-x2': `${heart.dx2}px`,
        '--heart-x3': `${heart.dx3}px`,
        '--heart-x4': `${heart.dx4}px`,
        '--heart-size': `${heart.size}px`,
      }}
    >
      ❤️
    </span>
  ));
}

// ==========================================
// COMPONENT: Comment Section
// ==========================================
function CommentSection({ postId, isOpen, onCommentAdded }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const anonymousName = getAnonymousName();

  const PREVIEW_COUNT = 2; // Chỉ hiện 2 bình luận trên card

  useEffect(() => {
    if (!isOpen) return undefined;

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setLoading(true);
    });

    axios.get(`${API_BASE_URL}/api/comments/bypost/${postId}`, {
      signal: controller.signal,
    }).then((res) => {
      setComments(res.data);
    }).catch((err) => {
      if (err.code !== 'ERR_CANCELED') {
        console.error('Lỗi tải bình luận:', err);
      }
    }).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, [isOpen, postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/comments`, {
        maBaiViet: postId,
        tenNguoiDung: anonymousName,
        noiDung: newComment.trim(),
      });
      setComments((prev) => [res.data, ...prev]);
      onCommentAdded?.();
      setNewComment('');
    } catch (err) {
      console.error('Lỗi gửi bình luận:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-section-enter mt-4 border-t border-white/10 pt-4">
      {/* Form nhập bình luận */}
      <form onSubmit={handleSubmit} className="flex min-w-0 gap-2 mb-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#F1D89E]/30 to-[#F1D89E]/10 border border-[#F1D89E]/20 flex items-center justify-center">
          <User className="w-4 h-4 text-[#F1D89E]/70" />
        </div>
        <div className="flex-1 min-w-0 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`${anonymousName}: ${t('blog.commentPlaceholder', 'Viết bình luận...')}`}
            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#F1D89E]/40 focus:bg-white/[0.07] transition-all"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-r from-[#F1D89E] to-[#e8c86e] flex items-center justify-center text-black hover:shadow-[0_0_16px_rgba(241,216,158,0.4)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Danh sách bình luận - chỉ hiện tối đa 2 */}
      <div className="space-y-2.5">
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-2">
            {t('blog.loadingComments', 'Đang tải bình luận...')}
          </p>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-2">
            {t('blog.noComments', 'Chưa có bình luận nào. Hãy là người đầu tiên! 💬')}
          </p>
        ) : (
          <>
            {comments.slice(0, PREVIEW_COUNT).map((c, idx) => (
              <div
                key={c.id || idx}
                className="comment-item-appear flex gap-2 group/comment"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center text-[9px] text-white/70 font-bold">
                  {c.tenNguoiDung?.charAt(c.tenNguoiDung.length - 1) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-[11px] font-semibold text-[#F1D89E]/80 truncate">
                      {c.tenNguoiDung}
                    </span>
                    <span className="text-[9px] text-gray-600 flex-shrink-0">
                      {c.ngayBinhLuan ? formatDateTime(c.ngayBinhLuan, { includeYear: false }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed break-words line-clamp-2">
                    {c.noiDung}
                  </p>
                </div>
              </div>
            ))}
            {comments.length > PREVIEW_COUNT && (
              <Link
                to={`/post/${postId}`}
                className="flex items-center justify-center gap-1 text-[11px] text-[#F1D89E]/70 hover:text-[#F1D89E] py-1.5 mt-1 border-t border-white/5 transition-colors"
              >
                {t('blog.viewAllComments', 'Xem tất cả')} {comments.length} {t('blog.commentsCount', 'bình luận')}
                <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT: Heart Button with Floating Effect
// ==========================================
function HeartButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes || 0);
  const [isLiked, setIsLiked] = useState(() => {
    return localStorage.getItem(`blog_liked_${postId}`) === 'true';
  });
  const [bouncing, setBouncing] = useState(false);
  const [hearts, setHearts] = useState([]);
  const buttonRef = useRef(null);
  const heartIdRef = useRef(0);

  const spawnFloatingHearts = () => {
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 trái tim
    const newHearts = [];
    for (let i = 0; i < count; i++) {
      heartIdRef.current += 1;
      newHearts.push({
        id: heartIdRef.current,
        x: `${-5 + Math.random() * 20}px`,
        y: `${-10 - Math.random() * 5}px`,
        dx1: -20 + Math.random() * 40,
        dx2: -15 + Math.random() * 30,
        dx3: -25 + Math.random() * 50,
        dx4: -10 + Math.random() * 20,
        size: 12 + Math.random() * 10,
      });
    }
    setHearts((prev) => [...prev, ...newHearts]);
    // Dọn dẹp sau animation
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => !newHearts.find((nh) => nh.id === h.id)));
    }, 1300);
  };

  const handleLike = async () => {
    // Hiệu ứng ngay lập tức (optimistic UI)
    setLikes((prev) => prev + 1);
    setIsLiked(true);
    localStorage.setItem(`blog_liked_${postId}`, 'true');
    setBouncing(true);
    spawnFloatingHearts();
    setTimeout(() => setBouncing(false), 450);

    // Gọi API
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/posts/${postId}/like`);
      setLikes(res.data.luotTim);
    } catch (err) {
      console.error('Lỗi like:', err);
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleLike}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 group/heart
        ${isLiked
          ? 'bg-red-500/10 border border-red-500/30 text-red-400 heart-glow'
          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5'
        }`}
    >
      <span className={`relative ${bouncing ? 'heart-bounce' : ''}`}>
        <Heart
          className={`w-4 h-4 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500' : 'group-hover/heart:scale-110'}`}
        />
      </span>
      <span className="text-xs font-medium min-w-[12px] tabular-nums">{likes}</span>
      <FloatingHearts hearts={hearts} />
    </button>
  );
}

// ==========================================
// MAIN COMPONENT: BlogSection
// ==========================================
export default function BlogSection() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('portfolioPosts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      try {
        localStorage.removeItem('portfolioPosts');
      } catch {
        // Tiếp tục bằng danh sách rỗng nếu storage không khả dụng.
      }
      return [];
    }
  });
  const [search, setSearch] = useState("");
  const [openComments, setOpenComments] = useState({}); // { postId: true/false }

  useEffect(() => {
    const controller = new AbortController();
    let etag = '';
    try {
      etag = localStorage.getItem('portfolioPostsEtag') || '';
    } catch {
      // ETag chỉ là tối ưu tùy chọn; request vẫn hoạt động nếu storage bị chặn.
    }

    axios.get(`${API_BASE_URL}/api/posts`, {
      signal: controller.signal,
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: (status) => status === 200 || status === 304,
    }).then((res) => {
      if (res.status === 304) return;

      const sorted = [...res.data].sort((a, b) => new Date(b.ngayDang) - new Date(a.ngayDang));
      setPosts(sorted);
      try {
        localStorage.setItem('portfolioPosts', JSON.stringify(sorted));
        if (res.headers.etag) {
          localStorage.setItem('portfolioPostsEtag', res.headers.etag);
        }
      } catch (error) {
        console.warn('Không thể lưu cache bài viết:', error);
      }
    }).catch((error) => {
      if (error.code === 'ERR_CANCELED') return;

      console.error(error);
      setPosts((currentPosts) => currentPosts.length > 0 ? currentPosts : [
        {
          maBaiViet: 1,
          tieuDe: t('blog.networkErrorTitle', 'Lỗi Mạng - Hãy bật Server C#'),
          noiDung: t('blog.networkErrorDesc', 'Đang chờ kết nối Backend C# từ localhost:5020...'),
          ngayDang: new Date().toISOString(),
          luotTim: 0,
          commentCount: 0,
        }
      ]);
    });

    return () => controller.abort();
  }, [t]);

  const incrementCommentCount = (postId) => {
    setPosts((currentPosts) => {
      const nextPosts = currentPosts.map((post) => post.maBaiViet === postId
        ? { ...post, commentCount: (post.commentCount || 0) + 1 }
        : post);
      try {
        localStorage.setItem('portfolioPosts', JSON.stringify(nextPosts));
      } catch (error) {
        console.warn('Không thể cập nhật cache số bình luận:', error);
      }
      return nextPosts;
    });
  };

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const filteredPosts = posts.filter(p => p.tieuDe?.toLowerCase().includes(search.toLowerCase()));

  return (
    <section id="blog" className="portfolio-section deferred-section deferred-section--blog min-h-screen pt-20 md:pt-24 pb-16 md:pb-24 px-3 md:px-12 lg:px-24">
      <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center" data-aos="fade-right">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('blog.title', 'Góc Cá Nhân (Blog)')}
      </h2>

      <div className="max-w-7xl mx-auto">
        <div className="nexbot-search glass flex items-center p-3 md:p-4 rounded-full mb-8 md:mb-12 w-full focus-within:ring-2 ring-[#F1D89E] transition-all bg-black/40 border-white/10" data-aos="fade-up" data-aos-delay="200">
          <Search className="text-gray-400 w-6 h-6 ml-3" />
          <input 
            type="text" 
            className="bg-transparent border-none outline-none text-white pl-4 w-full placeholder-gray-400"
            placeholder={t('blog.searchPlaceholder', 'Tìm kiếm bài viết ')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          {filteredPosts.map((post, idx) => (
            <div key={post.maBaiViet} className="nexbot-content-card glass rounded-2xl transition-all hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(241,216,158,0.2)] hover:border-[#F1D89E]/50 flex flex-col items-start bg-black/40 border border-[#F1D89E]/20 overflow-hidden group" data-aos="fade-up" data-aos-delay={200 + (idx * 100)}>
              {post.hinhAnhBia && (
                <div className="w-full h-40 md:h-56 relative border-b border-white/10 bg-black/80 flex items-center justify-center overflow-hidden">
                   <OptimizedImage
                     src={post.hinhAnhBia}
                     alt={`Ảnh bìa ${post.tieuDe}`}
                     widths={[320, 480, 640, 960]}
                     sizes="(min-width: 1280px) 264px, (min-width: 1024px) calc(25vw - 32px), (min-width: 640px) calc(50vw - 28px), calc(100vw - 32px)"
                     className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105"
                   />
                   {post.theLoai && (
                     <span className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-[#F1D89E] border border-[#F1D89E]/30 text-xs font-bold rounded-lg mb-3 uppercase tracking-wider">{post.theLoai}</span>
                   )}
                </div>
              )}
              
              <div className="p-4 md:p-6 flex flex-col h-full w-full">
                {!post.hinhAnhBia && post.theLoai && (
                  <span className="inline-block px-3 py-1 bg-white/5 text-[#F1D89E] border border-[#F1D89E]/30 text-xs font-bold rounded-lg mb-3 uppercase tracking-wider self-start">{post.theLoai}</span>
                )}
                
                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-white line-clamp-2">
                  <Link to={`/post/${post.maBaiViet}`} className="hover:text-[#F1D89E] transition-colors">{post.tieuDe}</Link>
                </h3>
                
                <p className="text-[#F1D89E]/60 text-xs mb-4">
                  {formatDateTime(post.ngayDang)}
                </p>
                
                <p className="text-gray-300 line-clamp-3 mb-5 flex-grow font-light text-sm leading-relaxed">
                  {post.tomTat || post.noiDung.replace(/<[^>]+>/g, '')}
                </p>

                {/* ===== Action Bar: Đọc tiếp + Tim + Bình luận ===== */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 gap-2">
                  <Link to={`/post/${post.maBaiViet}`} className="inline-block border border-[#F1D89E] text-[#F1D89E] px-3 py-1.5 rounded-full hover:bg-[#F1D89E] hover:text-black font-semibold transition-colors text-xs whitespace-nowrap">
                    {t('blog.readMore', 'Đọc tiếp')}
                  </Link>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Nút Tim */}
                    <HeartButton
                      key={`${post.maBaiViet}-${post.luotTim || 0}`}
                      postId={post.maBaiViet}
                      initialLikes={post.luotTim || 0}
                    />

                    {/* Nút Bình luận */}
                    <button
                      onClick={() => toggleComments(post.maBaiViet)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all duration-300
                        ${openComments[post.maBaiViet]
                          ? 'bg-[#F1D89E]/10 border border-[#F1D89E]/30 text-[#F1D89E]'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-[#F1D89E] hover:border-[#F1D89E]/30 hover:bg-[#F1D89E]/5'
                        }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium min-w-[12px] tabular-nums">
                        {post.commentCount || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* ===== Comment Section ===== */}
                <CommentSection
                  postId={post.maBaiViet}
                  isOpen={openComments[post.maBaiViet] || false}
                  onCommentAdded={() => incrementCommentCount(post.maBaiViet)}
                />
              </div>
            </div>
          ))}
        </div>
        {filteredPosts.length === 0 && (
           <p className="text-center text-gray-400 mt-10">{t('blog.empty', 'Bạn chưa có bài viết kỹ thuật nào.')}</p>
        )}
      </div>
    </section>
  );
}
