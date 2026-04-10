import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Search, Heart, MessageCircle, Send, User } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

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
function CommentSection({ postId, isOpen }) {
  const { t } = useTranslation();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const anonymousName = getAnonymousName();

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

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

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
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#F1D89E]/30 to-[#F1D89E]/10 border border-[#F1D89E]/20 flex items-center justify-center">
          <User className="w-4 h-4 text-[#F1D89E]/70" />
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={`${anonymousName}: ${t('blog.commentPlaceholder', 'Viết bình luận...')}`}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#F1D89E]/40 focus:bg-white/[0.07] transition-all"
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

      {/* Danh sách bình luận */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-3">
            {t('blog.loadingComments', 'Đang tải bình luận...')}
          </p>
        ) : comments.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-3">
            {t('blog.noComments', 'Chưa có bình luận nào. Hãy là người đầu tiên! 💬')}
          </p>
        ) : (
          <>
            {(showAllComments ? comments : comments.slice(0, 3)).map((c, idx) => (
              <div
                key={c.id || idx}
                className="comment-item-appear flex gap-2.5 group/comment"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center text-[10px] text-white/70 font-bold">
                  {c.tenNguoiDung?.charAt(c.tenNguoiDung.length - 1) || '?'}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-[#F1D89E]/80 truncate">
                      {c.tenNguoiDung}
                    </span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {c.ngayBinhLuan
                        ? format(new Date(c.ngayBinhLuan), 'dd/MM HH:mm')
                        : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed break-words">
                    {c.noiDung}
                  </p>
                </div>
              </div>
            ))}
            {comments.length > 3 && (
              <button
                onClick={(e) => { e.preventDefault(); setShowAllComments(!showAllComments); }}
                className="w-full text-center text-xs text-[#F1D89E]/80 hover:text-[#F1D89E] py-2 mt-2 border-t border-white/5 transition-colors"
              >
                {showAllComments ? t('blog.hideComments', 'Thu gọn') : `${t('blog.viewAllComments', 'Xem tất cả')} ${comments.length} ${t('blog.commentsCount', 'bình luận')}`}
              </button>
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

  // Sync likes from parent khi initialLikes thay đổi (fetch mới)
  useEffect(() => {
    if (initialLikes !== undefined && initialLikes !== null) {
      setLikes(initialLikes);
    }
  }, [initialLikes]);

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
    const saved = localStorage.getItem('portfolioPosts');
    return saved ? JSON.parse(saved) : [];
  });
  const [search, setSearch] = useState("");
  const [openComments, setOpenComments] = useState({}); // { postId: true/false }
  const [commentCounts, setCommentCounts] = useState({}); // { postId: count }

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/posts`);
      // Sắp xếp mới nhất lên đầu
      const sorted = res.data.sort((a,b) => new Date(b.ngayDang) - new Date(a.ngayDang));
      setPosts(sorted);
      localStorage.setItem('portfolioPosts', JSON.stringify(sorted));
    } catch (error) {
      console.error(error);
      // Dữ liệu mẫu nếu server lỗi
      setPosts([
        { maBaiViet: 1, tieuDe: t('blog.networkErrorTitle', 'Lỗi Mạng - Hãy bật Server C#'), noiDung: t('blog.networkErrorDesc', 'Đang chờ kết nối Backend C# từ localhost:5020...'), ngayDang: new Date().toISOString(), luotTim: 0 }
      ]);
    }
  };

  // Fetch số lượng comment cho mỗi post
  const fetchCommentCounts = async (postsList) => {
    const counts = {};
    await Promise.all(
      postsList.map(async (post) => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/comments/bypost/${post.maBaiViet}`);
          counts[post.maBaiViet] = res.data.length;
        } catch {
          counts[post.maBaiViet] = 0;
        }
      })
    );
    setCommentCounts(counts);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (posts.length > 0) {
      fetchCommentCounts(posts);
    }
  }, [posts]);

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const filteredPosts = posts.filter(p => p.tieuDe?.toLowerCase().includes(search.toLowerCase()));

  return (
    <section id="blog" className="min-h-screen pt-20 md:pt-24 pb-16 md:pb-24 px-3 md:px-12 lg:px-24">
      <h2 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] mb-8 md:mb-12 flex items-center" data-aos="fade-right">
        <span className="bg-[#F1D89E] w-8 md:w-12 h-1 mr-3 md:mr-4"></span> {t('blog.title', 'Góc Cá Nhân (Blog)')}
      </h2>

      <div className="max-w-4xl mx-auto">
        <div className="glass flex items-center p-3 md:p-4 rounded-full mb-8 md:mb-12 w-full focus-within:ring-2 ring-[#F1D89E] transition-all bg-black/40 border-white/10" data-aos="fade-up" data-aos-delay="200">
          <Search className="text-gray-400 w-6 h-6 ml-3" />
          <input 
            type="text" 
            className="bg-transparent border-none outline-none text-white pl-4 w-full placeholder-gray-400"
            placeholder={t('blog.searchPlaceholder', 'Tìm kiếm bài viết ')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
          {filteredPosts.map((post, idx) => (
            <div key={post.maBaiViet} className="glass rounded-2xl transition-all hover:-translate-y-2 hover:shadow-[0_0_20px_rgba(241,216,158,0.2)] hover:border-[#F1D89E]/50 flex flex-col items-start bg-black/40 border border-[#F1D89E]/20 overflow-hidden group" data-aos="fade-up" data-aos-delay={200 + (idx * 100)}>
              {post.hinhAnhBia && (
                <div className="w-full h-40 md:h-56 relative border-b border-white/10 bg-black/80 flex items-center justify-center overflow-hidden">
                   <img src={post.hinhAnhBia.startsWith('http') ? post.hinhAnhBia : `${API_BASE_URL}${post.hinhAnhBia.startsWith('/') ? '' : '/'}${post.hinhAnhBia}`} alt="Cover" className="max-w-full max-h-full object-contain transition-transform duration-700 group-hover:scale-105" />
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
                  {format(new Date(post.ngayDang), 'dd/MM/yyyy HH:mm')}
                </p>
                
                <p className="text-gray-300 line-clamp-3 mb-5 flex-grow font-light text-sm leading-relaxed">
                  {post.tomTat || post.noiDung.replace(/<[^>]+>/g, '')}
                </p>

                {/* ===== Action Bar: Đọc tiếp + Tim + Bình luận ===== */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                  <Link to={`/post/${post.maBaiViet}`} className="inline-block border border-[#F1D89E] text-[#F1D89E] px-5 py-1.5 rounded-full hover:bg-[#F1D89E] hover:text-black font-semibold transition-colors text-sm">
                    {t('blog.readMore', 'Đọc tiếp')}
                  </Link>

                  <div className="flex items-center gap-2">
                    {/* Nút Tim */}
                    <HeartButton postId={post.maBaiViet} initialLikes={post.luotTim || 0} />

                    {/* Nút Bình luận */}
                    <button
                      onClick={() => toggleComments(post.maBaiViet)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300
                        ${openComments[post.maBaiViet]
                          ? 'bg-[#F1D89E]/10 border border-[#F1D89E]/30 text-[#F1D89E]'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:text-[#F1D89E] hover:border-[#F1D89E]/30 hover:bg-[#F1D89E]/5'
                        }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-medium min-w-[12px] tabular-nums">
                        {commentCounts[post.maBaiViet] || 0}
                      </span>
                    </button>
                  </div>
                </div>

                {/* ===== Comment Section ===== */}
                <CommentSection
                  postId={post.maBaiViet}
                  isOpen={openComments[post.maBaiViet] || false}
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
