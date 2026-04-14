import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, ServerCrash, ShieldAlert, Cpu, Activity, Database } from 'lucide-react';
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
        }, 150);
        return () => clearInterval(interval);
    }, []);

    const handleLogoClick = () => {
        setClicks(prev => prev + 1);
    };

    return (
        <div className="fixed inset-0 z-[99999] overflow-hidden bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-4 font-sans">
            
            {/* Advanced Animated Environment */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] z-0"></div>
            
            {/* Dynamic Grid Background */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
                style={{
                    backgroundImage: `linear-gradient(rgba(241, 216, 158, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(241, 216, 158, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
                    animation: 'grid-move 20s linear infinite'
                }}>
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-[#F1D89E] opacity-[0.07] rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[50vw] h-[50vw] bg-indigo-500 opacity-[0.05] rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            
            {/* Radar / HUD Rings background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] border border-white/5 rounded-full pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] border-[0.5px] border-[#F1D89E]/5 rounded-full pointer-events-none border-dashed animate-[spin_30s_linear_infinite_reverse]"></div>

            {/* Main Cyber-Glass Panel */}
            <div className="relative z-10 max-w-2xl w-full mx-auto p-12 glass bg-black/60 border-t border-b border-[#F1D89E]/20 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(241,216,158,0.05)] backdrop-blur-3xl flex flex-col items-center text-center group">
                
                {/* Panel Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#F1D89E]/50 rounded-tl-3xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#F1D89E]/50 rounded-tr-3xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#F1D89E]/50 rounded-bl-3xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#F1D89E]/50 rounded-br-3xl"></div>

                {/* Cyber HUD Badges */}
                <div className="absolute -top-4 w-full flex justify-center z-20 pointer-events-none">
                    <div className="bg-[#0a0a0a] border border-[#F1D89E]/30 text-[#F1D89E] text-[10px] items-center gap-2 font-black px-6 py-1 rounded-full uppercase tracking-[0.2em] shadow-[0_0_10px_rgba(241,216,158,0.2)] flex">
                        <Activity className="w-3 h-3 animate-pulse text-red-500" /> V-1.0.4 CORE OFFLINE
                    </div>
                </div>

                {/* Animated Logo Section - FIXED SPIN */}
                <div className="relative mt-4 mb-12 w-44 h-44 flex items-center justify-center">
                    
                    {/* Ring 1: Outer Slow Dash */}
                    <div className="absolute inset-0 border-[2px] border-dashed border-[#F1D89E]/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    {/* Ring 2: Thicker partial ring */}
                    <div className="absolute inset-2 border-[4px] border-transparent border-t-[#F1D89E]/30 border-b-[#F1D89E]/30 rounded-full animate-[spin_3s_ease-in-out_infinite_alternate]"></div>
                    
                    {/* Glowing Aura */}
                    <div className="absolute inset-8 bg-[#F1D89E]/10 blur-2xl rounded-full animate-pulse"></div>
                    
                    {/* Interactive Logo Container */}
                    <button 
                        onClick={handleLogoClick} 
                        className="relative w-24 h-24 rounded-full bg-black/40 border border-[#F1D89E]/30 flex items-center justify-center outline-none transition-all duration-300 hover:scale-110 hover:bg-[#F1D89E]/10 hover:border-[#F1D89E]/60 focus:scale-110 active:scale-95 group-hover:shadow-[0_0_30px_rgba(241,216,158,0.4)] z-20 overflow-hidden"
                    >
                        {/* Wrapper for the settings gear - safe for spin */}
                        <div className={`transition-all duration-500 ${clicks < 3 ? 'animate-[spin_4s_linear_infinite]' : 'text-emerald-400 rotate-180 scale-110'}`}>
                            <Settings className="w-14 h-14 text-[#F1D89E] drop-shadow-[0_0_5px_rgba(241,216,158,1)]" />
                        </div>
                        
                        {/* Wrapper for the inner refresh - centered by flex, independently spinning */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="animate-[spin_2s_linear_infinite_reverse]">
                                <RefreshCw className={`w-5 h-5 ${clicks < 3 ? 'text-white' : 'text-emerald-300'} drop-shadow-md`} />
                            </div>
                        </div>
                    </button>
                </div>

                {/* Text Content */}
                <div className="relative z-10 w-full mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#aaaaaa] via-white to-[#aaaaaa] tracking-tight uppercase mb-4 drop-shadow-lg relative inline-block">
                        Hệ Thống Đang Cập Nhật
                        <div className="absolute -bottom-2 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-[#F1D89E]/50 to-transparent blur-sm"></div>
                    </h1>
                    
                    <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed mt-4 border-l-2 border-[#F1D89E]/30 pl-4 text-left">
                        Chúng tôi đang thực hiện bảo trì định kỳ nhằm tối ưu hóa hiệu suất và nâng cấp các tính năng mới. Mọi dịch vụ sẽ sớm được khôi phục. Cảm ơn sự kiên nhẫn của bạn.
                    </p>
                </div>
                
                {/* Advanced Diagnostic Progress Tracker */}
                <div className="w-full max-w-lg bg-[#000000]/80 p-5 rounded-2xl border border-white/10 relative z-10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span className="text-[11px] text-gray-300 font-mono font-bold uppercase tracking-[0.1em]">
                                Tiến trình Compile Data
                            </span>
                        </div>
                        <span className="text-xs text-[#F1D89E] font-mono font-black border border-[#F1D89E]/30 px-2 py-0.5 rounded bg-[#F1D89E]/10">{progress}%</span>
                    </div>
                    {/* Segmented Progress Bar */}
                    <div className="h-2 flex gap-1 w-full bg-black/50 p-0.5 rounded-lg border border-white/5 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500/50 via-[#F1D89E] to-yellow-400 rounded-md transition-all duration-[150ms] ease-linear shadow-[0_0_10px_rgba(241,216,158,0.5)]"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    {/* Log Simulation */}
                    <div className="mt-3 flex gap-4 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-indigo-400"/> Mem: OPTIMAL</span>
                        <span className="flex items-center gap-1">SYS_CHECK_OK</span>
                    </div>
                </div>
                
                {/* Hidden Admin Login Button Wrapper */}
                <div className={`mt-8 relative z-20 transition-all duration-500 ease-out flex items-center justify-center ${clicks >= 3 ? 'h-16 opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-4 overflow-hidden'}`}>
                    <button 
                        onClick={() => {
                            onBypass();
                            navigate('/admin');
                        }}
                        className="group/btn flex items-center gap-3 bg-[#F1D89E] text-black px-10 py-3.5 rounded-full font-extrabold uppercase tracking-widest shadow-[0_0_20px_rgba(241,216,158,0.3)] hover:shadow-[0_0_40px_rgba(241,216,158,0.8)] hover:bg-white transition-all transform hover:scale-110 overflow-hidden relative"
                    >
                        {/* Shine Effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"></div>
                        <ShieldAlert className="w-5 h-5 relative z-10 text-black group-hover/btn:animate-bounce" />
                        <span className="relative z-10">Mở Cổng Quản Trị</span>
                    </button>
                </div>
            </div>
            
            {/* Footer Notice */}
            <p className="absolute bottom-6 text-[#F1D89E]/40 text-[10px] font-mono font-bold flex items-center gap-2 tracking-[0.2em]">
                <ServerCrash className="w-3 h-3" /> SECURE ROOT ACCESS ONLY
            </p>

            <style>{`
                @keyframes grid-move {
                    0% { transform: perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px); }
                    100% { transform: perspective(500px) rotateX(60deg) translateY(0) translateZ(-200px); }
                }
            `}</style>
        </div>
    );
}
