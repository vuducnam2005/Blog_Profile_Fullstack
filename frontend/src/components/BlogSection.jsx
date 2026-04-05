import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';

export default function BlogSection() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState(() => {
    const saved = localStorage.getItem('portfolioPosts');
    return saved ? JSON.parse(saved) : [];
  });
  const [search, setSearch] = useState("");

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
        { maBaiViet: 1, tieuDe: t('blog.networkErrorTitle', 'Lỗi Mạng - Hãy bật Server C#'), noiDung: t('blog.networkErrorDesc', 'Đang chờ kết nối Backend C# từ localhost:5020...'), ngayDang: new Date().toISOString() }
      ]);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPosts();
  }, []);

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
                
                <p className="text-gray-300 line-clamp-3 mb-6 flex-grow font-light text-sm leading-relaxed">
                  {post.tomTat || post.noiDung.replace(/<[^>]+>/g, '')}
                </p>
                <Link to={`/post/${post.maBaiViet}`} className="mt-auto self-start inline-block border border-[#F1D89E] text-[#F1D89E] px-6 py-2 rounded-full hover:bg-[#F1D89E] hover:text-black font-semibold transition-colors text-sm">
                  {t('blog.readMore', 'Đọc tiếp')}
                </Link>
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
