import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, FileText, Settings } from 'lucide-react';
import BlogEditor from '../components/Admin/BlogEditor';
import ConfigEditor from '../components/Admin/ConfigEditor';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Admin() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { isAdmin, login } = useAuth();

  // Authentication State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [hasAuthError, setHasAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState("blog"); // "blog" | "config"

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "0362183511" && password === "Vuducnam2005@") {
      login();
      setHasAuthError(false);
    } else {
      setHasAuthError(true);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 relative z-20">
        <div className="max-w-md w-full glass rounded-3xl p-8 bg-black/60 shadow-2xl relative border border-[#F1D89E]/20">
            <button onClick={() => navigate('/')} className="absolute top-6 left-6 text-gray-400 hover:text-[#F1D89E] transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center mb-8 mt-4">
                <div className="p-4 bg-[#F1D89E]/10 rounded-full mb-4">
                    <Lock className="w-8 h-8 text-[#F1D89E]" />
                </div>
                <h1 className="text-2xl font-bold text-center text-white tracking-wide">
                    {t('admin.loginTitle', 'Xác Thực Quản Trị Hệ Thống')}
                </h1>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#F1D89E] mb-2 uppercase tracking-wider">{t('admin.phoneLabel', 'Tài khoản (SĐT)')}</label>
                  <input 
                      type="text" 
                      required 
                      autoComplete="off"
                      value={username} 
                      onChange={e => setUsername(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                      placeholder={t('admin.phonePlaceholder', 'Nhập tên tài khoản...')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#F1D89E] mb-2 uppercase tracking-wider">{t('admin.passwordLabel', 'Mật khẩu')}</label>
                  <input 
                      type="password" 
                      required 
                      autoComplete="new-password"
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F1D89E] focus:ring-1 focus:ring-[#F1D89E] transition-all"
                      placeholder={t('admin.passwordPlaceholder', 'Nhập mật khẩu...')}
                  />
                </div>

                {hasAuthError && <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-2 rounded-lg">{t('admin.authError', 'Tài khoản hoặc mật khẩu không chính xác!')}</p>}

                <button 
                  type="submit" 
                  className="mt-4 bg-[#F1D89E] text-black font-bold text-lg py-3 rounded-xl hover:bg-white border hover:border-white shadow-[0_0_15px_rgba(241,216,158,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.6)] transition-all uppercase tracking-widest"
                >
                  {t('admin.loginBtn', 'ĐĂNG NHẬP')}
                </button>
            </form>
        </div>
      </div>
    );
  }

  // Luôn ẩn Tabs nếu đang ở màn hình Chỉnh sửa bài viết cũ (isEdit = true)
  return (
    <div className="relative z-20">
        {!isEdit && (
            <div className="pt-24 max-w-lg mx-auto px-4 mb-[-2rem]">
                <div className="flex bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('blog')}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'blog' ? 'bg-[#F1D89E] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <FileText className="w-5 h-5"/> {t('admin.tabBlog', 'Bài Viết Báo Mới')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'config' ? 'bg-[#F1D89E] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Settings className="w-5 h-5"/> {t('admin.tabConfig', 'Giao diện Trang Chủ')}
                    </button>
                </div>
            </div>
        )}

        {(activeTab === 'blog' || isEdit) ? <BlogEditor /> : <ConfigEditor />}
    </div>
  );
}
