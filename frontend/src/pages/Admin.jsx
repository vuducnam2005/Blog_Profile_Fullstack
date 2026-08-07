import { useState } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Lock, FileText, Settings, LogOut } from 'lucide-react';
import BlogEditor from '../components/Admin/BlogEditor';
import ConfigEditor from '../components/Admin/ConfigEditor';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isAdmin, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("blog"); // "blog" | "config"

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Người dùng chưa xác thực khi truy cập trực tiếp /admin sẽ tự động bị đẩy về Trang chủ /
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Luôn ẩn Tabs nếu đang ở màn hình Chỉnh sửa bài viết cũ (isEdit = true)
  return (
    <div className="relative z-20">
        {!isEdit && (
            <div className="pt-24 max-w-lg mx-auto px-4 mb-[-2rem]">
                <div className="flex bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md items-center justify-between gap-2">
                    <button 
                        onClick={() => setActiveTab('blog')}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'blog' ? 'bg-[#F1D89E] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <FileText className="w-5 h-5"/> {t('admin.tabBlog', 'Bài Viết')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'config' ? 'bg-[#F1D89E] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings className="w-5 h-5"/> {t('admin.tabConfig', 'Giao diện')}
                    </button>
                    <button 
                        onClick={handleLogout}
                        title="Đăng xuất khỏi Quản trị"
                        className="p-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-red-500/30 shrink-0"
                    >
                        <LogOut className="w-5 h-5"/>
                    </button>
                </div>
            </div>
        )}

        {(activeTab === 'blog' || isEdit) ? <BlogEditor /> : <ConfigEditor />}
    </div>
  );
}
