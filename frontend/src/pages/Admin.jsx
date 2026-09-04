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
        <div className={`max-w-3xl mx-auto px-2 sm:px-4 ${
          activeTab === 'chat' ? 'pt-12 sm:pt-20 mb-2 sm:mb-4' : 'pt-16 sm:pt-24 mb-4 sm:mb-6'
        }`}>
          <div className="flex bg-[#0d0f18] p-1.5 sm:p-2 rounded-2xl border border-white/15 items-center justify-between gap-1 sm:gap-2 shadow-2xl">
            <button
              onClick={() => setActiveTab('blog')}
              className={`flex-1 flex justify-center items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'blog'
                  ? 'bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t('admin.tabBlog', 'Bài Viết')}</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex-1 flex justify-center items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'config'
                  ? 'bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t('admin.tabConfig', 'Giao Diện')}</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('chat');
                setUnreadCount(0);
              }}
              className={`relative flex-1 flex justify-center items-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-[#F1D89E] to-[#d8b868] text-black shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="truncate">{t('admin.tabChat', 'Tin Nhắn')}</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-extrabold text-[10px] animate-pulse shrink-0">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              title="Đăng xuất khỏi Quản trị"
              className="p-2.5 sm:p-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all border border-red-500/30 shrink-0"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
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
