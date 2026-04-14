import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MaintenanceOverlay({ onBypass }) {
    const { t } = useTranslation();
    const [clicks, setClicks] = useState(0);
    const navigate = useNavigate();

    const handleLogoClick = () => {
        setClicks(prev => prev + 1);
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black flex flex-col items-center justify-center text-white p-4">
            <div className="flex flex-col items-center animate-fade-in relative max-w-lg text-center gap-6">
                <button 
                    onClick={handleLogoClick} 
                    className="outline-none transition-transform hover:scale-110 focus:scale-110"
                >
                    <Settings className={`w-28 h-28 text-[#F1D89E] ${clicks < 3 ? 'animate-spin-slow' : ''}`} />
                </button>

                <h1 className="text-3xl md:text-5xl font-extrabold text-[#F1D89E] tracking-tight">
                    Hệ Thống Đang Bảo Trì
                </h1>
                
                <p className="text-gray-400 text-lg md:text-xl">
                    Xin lỗi vì sự bất tiện này. Chúng tôi đang thực hiện nâng cấp hệ thống và sẽ quay trở lại trong thời gian sớm nhất!
                </p>
                
                <div className="h-[60px] flex items-center justify-center mt-4">
                    {clicks >= 3 && (
                        <button 
                            onClick={() => {
                                onBypass();
                                navigate('/admin');
                            }}
                            className="bg-[#F1D89E] text-black px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(241,216,158,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] hover:bg-white transition-all transform hover:scale-105"
                        >
                            Đăng nhập Admin
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
