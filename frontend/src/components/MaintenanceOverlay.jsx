import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, ServerCrash, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MaintenanceOverlay({ onBypass }) {
    const { t } = useTranslation();
    const [clicks, setClicks] = useState(0);
    const [progress, setProgress] = useState(0);
    const navigate = useNavigate();

    // Fake progress bar
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => (p < 99 ? p + 1 : 0));
        }, 300);
        return () => clearInterval(interval);
    }, []);

    const handleLogoClick = () => {
        setClicks(prev => prev + 1);
    };

    return (
        <div className="fixed inset-0 z-[99999] overflow-hidden bg-[#050505] flex flex-col items-center justify-center text-white p-4">
            
            {/* Animated Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F1D89E] opacity-10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-500 opacity-10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] border border-white/5 rounded-full animate-spin-slow"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] border border-[#F1D89E]/5 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

            {/* Main Glass Panel */}
            <div className="relative z-10 max-w-2xl w-full mx-auto p-10 md:p-14 glass bg-black/40 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col items-center text-center group">
                
                {/* Hardware Grid Effect inside panel */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30 rounded-[2.5rem] pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 rounded-[2.5rem] pointer-events-none"></div>

                {/* Animated Logo Section */}
                <div className="relative mb-10 w-40 h-40 flex items-center justify-center">
                    {/* Outer Rotating Dashed Ring */}
                    <div className="absolute inset-0 border-[3px] border-dashed border-[#F1D89E]/30 rounded-full animate-[spin_8s_linear_infinite]"></div>
                    {/* Reverse Rotating Inner Ring */}
                    <div className="absolute inset-4 border border-[#F1D89E]/40 rounded-full animate-[spin_4s_linear_infinite_reverse]"></div>
                    
                    {/* Glowing effect under icon */}
                    <div className="absolute inset-0 bg-[#F1D89E]/20 blur-2xl rounded-full"></div>
                    
                    {/* Interactive Logo */}
                    <button 
                        onClick={handleLogoClick} 
                        className="relative outline-none transition-transform hover:scale-110 focus:scale-110 active:scale-95 group-hover:drop-shadow-[0_0_20px_rgba(241,216,158,0.8)] z-20"
                    >
                        <div className="relative">
                            <Settings className={`w-20 h-20 text-[#F1D89E] opacity-80 ${clicks < 3 ? 'animate-spin-slow' : 'text-emerald-400 animate-bounce'}`} />
                            <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-black animate-spin" />
                        </div>
                    </button>
                    
                    {/* Status Badge */}
                    <div className="absolute -bottom-4 bg-red-500/10 border border-red-500/50 text-red-400 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse">
                        OFFLINE
                    </div>
                </div>

                <div className="relative z-10 w-full mb-8">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#F1D89E] to-white tracking-tight uppercase mb-4 drop-shadow-lg">
                        Hệ Thống Đang Nâng Cấp
                    </h1>
                    
                    <p className="text-gray-400 text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                        Website đang được bảo trì để mang lại trải nghiệm tuyệt vời hơn. Hệ thống sẽ tự động khôi phục trong thời gian sớm nhất!
                    </p>
                </div>
                
                {/* System Process Bar Simulator */}
                <div className="w-full max-w-md bg-white/5 p-4 rounded-2xl border border-white/5 relative z-10 text-left">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Đang cập nhật gói dữ liệu...
                        </span>
                        <span className="text-[10px] text-[#F1D89E] font-mono font-bold">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-black rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-[#F1D89E]/50 to-[#F1D89E] rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="w-full h-full bg-[rgba(255,255,255,0.2)] animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>
                
                {/* Hidden Admin Login Button */}
                <div className="mt-8 relative z-20 h-16 flex items-center justify-center">
                    {clicks >= 3 && (
                        <button 
                            onClick={() => {
                                onBypass();
                                navigate('/admin');
                            }}
                            className="group/btn flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-full font-extrabold uppercase tracking-widest shadow-[0_0_30px_rgba(241,216,158,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.8)] transition-all transform hover:scale-105 overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-[#F1D89E] to-white opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                            <ShieldAlert className="w-5 h-5 relative z-10 text-black group-hover/btn:animate-pulse" />
                            <span className="relative z-10">Vào Trang Quản Trị</span>
                        </button>
                    )}
                </div>
                
            </div>
            
            {/* Footer Notice */}
            <p className="absolute bottom-6 text-gray-600 text-xs font-mono font-bold flex items-center gap-2">
                <ServerCrash className="w-4 h-4" /> SECURE MAINTENANCE PROTOCOL ACTIVE
            </p>
        </div>
    );
}
