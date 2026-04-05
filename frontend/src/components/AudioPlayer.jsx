import React, { useContext } from 'react';
import { AudioContext } from '../context/AudioContext';
import { Music, X, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AudioPlayer() {
    const { t } = useTranslation();
    const { showPrompt, handleAccept, handleDecline, audioUrl, isAudioLoaded } = useContext(AudioContext);

    // Không render popup nếu không có audio url để thiết lập hoặc popup không được show
    if (!audioUrl || !showPrompt) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
                className="bg-black/90 p-8 rounded-3xl border border-[#F1D89E]/30 shadow-[0_0_50px_rgba(241,216,158,0.2)] max-w-sm w-full relative overflow-hidden"
                style={{
                    animation: 'lightboxIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Decorative background glow */}
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#F1D89E] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[#00D0C8] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`w-20 h-20 rounded-full bg-[#F1D89E]/10 border border-[#F1D89E] border-dashed flex items-center justify-center mb-6 ${isAudioLoaded ? 'animate-[spin_10s_linear_infinite]' : 'animate-pulse'}`}>
                         <Music className={`w-10 h-10 text-[#F1D89E] ${isAudioLoaded ? 'animate-[spin_10s_linear_infinite_reverse]' : ''}`} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-white mb-3">Tận Hưởng Âm Nhạc?</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        Hi bạn, website của mình có một chút giai điệu nhẹ nhàng. Bạn có muốn phát nhạc để trải nghiệm không gian tốt nhất không?
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <button 
                            onClick={handleAccept}
                            className="bg-[#F1D89E] text-black hover:bg-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(241,216,158,0.3)] flex justify-center items-center gap-2 hover:scale-105"
                        >
                            <Volume2 className="w-5 h-5"/> Phát Nhạc Ngay
                        </button>
                        <button 
                            onClick={handleDecline}
                            className="bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 font-medium py-3 px-6 rounded-xl transition-all flex justify-center items-center gap-2 border border-white/10"
                        >
                            <VolumeX className="w-5 h-5"/> Im Lặng
                        </button>
                    </div>
                </div>
                
                {/* Nút tắt nhỏ góc trên bên phải nếu họ lười không ấn 2 nút kia */}
                <button 
                    onClick={handleDecline}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
