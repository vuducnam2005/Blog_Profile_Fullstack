import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTranslation } from 'react-i18next';
import { useAuth, ADMIN_API_KEY } from '../context/AuthContext';

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
        <div className="w-full mb-6 md:mb-10 rounded-xl md:rounded-2xl shadow-[0_0_30px_rgba(241,216,158,0.1)] overflow-hidden border border-white/10">
          <img 
              src={post.hinhAnhBia.startsWith('http') ? post.hinhAnhBia : `${API_BASE_URL}${post.hinhAnhBia}`} 
              alt={post.tieuDe} 
              className="w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-700" 
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
        <span>{t('detail.postedOn', 'Ngày đăng:')} {format(new Date(post.ngayDang), 'dd/MM/yyyy HH:mm')}</span>
        
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
    </div>
  );
}
