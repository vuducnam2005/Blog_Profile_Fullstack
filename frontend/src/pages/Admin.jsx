import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { FileText, Settings, LogOut, MessageSquare } from 'lucide-react';
import BlogEditor from '../components/Admin/BlogEditor';
import ConfigEditor from '../components/Admin/ConfigEditor';
import DirectChatManager from '../components/Admin/DirectChatManager';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { fetchAdminUnreadCount, createChatHubConnection } from '../services/directChatService';
import { ADMIN_API_KEY } from '../context/AuthContext';

export default function Admin() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isAdmin, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('blog'); // "blog" | "config" | "chat"
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    if (!isAdmin) return;

    fetchAdminUnreadCount().then((count) => setUnreadCount(count));

    const hub = createChatHubConnection();
    hub.on('ReceiveMessage', (msg) => {
      if (!msg.isFromAdmin) {
        fetchAdminUnreadCount().then((count) => setUnreadCount(count));
      }
    });

    hub.on('MessagesRead', () => {
      fetchAdminUnreadCount().then((count) => setUnreadCount(count));
    });

    hub.start().then(async () => {
      await hub.invoke('JoinAdmin', ADMIN_API_KEY);
    }).catch(() => {});

    return () => {
      hub.stop().catch(() => {});
    };
  }, [isAdmin]);

  // Người dùng chưa xác thực khi truy cập trực tiếp /admin sẽ tự động bị đẩy về Trang chủ /
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Luôn ẩn Tabs nếu đang ở màn hình Chỉnh sửa bài viết cũ (isEdit = true)
  return (
    <div className="relative z-20">
      {!isEdit && (
        <div className="pt-24 max-w-2xl mx-auto px-4 mb-[-2rem]">
          <div className="flex bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md items-center justify-between gap-2">
            <button
              onClick={() => setActiveTab('blog')}
              className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'blog'
                  ? 'bg-[#F1D89E] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">{t('admin.tabBlog', 'Bài Viết')}</span>
              <span className="sm:hidden">Bài Viết</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'config'
                  ? 'bg-[#F1D89E] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="hidden sm:inline">{t('admin.tabConfig', 'Giao diện')}</span>
              <span className="sm:hidden">Giao diện</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('chat');
                setUnreadCount(0);
              }}
              className={`relative flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-[#F1D89E] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="hidden sm:inline">{t('admin.tabChat', 'Tin Nhắn')}</span>
              <span className="sm:hidden">Tin Nhắn</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-extrabold text-[10px] animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi Quản trị"
              className="p-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-red-500/30 shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {isEdit ? (
        <BlogEditor />
      ) : activeTab === 'blog' ? (
        <BlogEditor />
      ) : activeTab === 'config' ? (
        <ConfigEditor />
      ) : (
        <DirectChatManager />
      )}
    </div>
  );
}
