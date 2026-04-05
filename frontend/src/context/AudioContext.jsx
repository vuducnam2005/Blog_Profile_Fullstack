import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { PortfolioContext } from './PortfolioContext';
import { API_BASE_URL } from '../config';

export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const { data } = useContext(PortfolioContext);
    
    // get audio url
    const backgroundMusic = data?.hero?.backgroundMusic;
    let audioUrl = backgroundMusic ? (backgroundMusic.startsWith('http') ? backgroundMusic : `${API_BASE_URL}${backgroundMusic}`) : null;

    // Tối ưu hóa Audio qua Cloudinary nếu có thể
    if (audioUrl && audioUrl.includes('cloudinary.com')) {
        const parts = audioUrl.split('/upload/');
        if (parts.length === 2) {
            // f_auto: tự động định dạng (mp3, opus, etc)
            // q_auto: tự động nén chất lượng (bitrate)
            audioUrl = `${parts[0]}/upload/f_auto,q_auto/${parts[1]}`;
        }
    }

    const [isPlaying, setIsPlaying] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [volume, setVolume] = useState(0.5); // Default volume 50%
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const audioRef = useRef(null);

    // Kiểm tra xem đã từng hỏi chưa
    useEffect(() => {
        if (!audioUrl) return; // Nếu không có nhạc cấu hình, không làm gì cả
        
        const answered = sessionStorage.getItem('hasAnsweredAudioPrompt');
        if (!answered) {
            // Chờ 1 chút xíu để page render xong rồi hiện prompt
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setHasInteracted(true);
            // Nếu người ta đã đồng ý, ta có thể khôi phục trạng thái phát
            const wasPlaying = sessionStorage.getItem('audioWasPlaying') === 'true';
            if (wasPlaying) {
                 setIsPlaying(true);
            }
        }
    }, [audioUrl]);

    // Đồng bộ state `isPlaying` với thẻ Audio
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            if (isPlaying) {
                // Play trả về một Promise, vì vậy bắt lỗi nếu bị trình duyệt chặn
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Auto-play was prevented:", error);
                        setIsPlaying(false);
                        sessionStorage.setItem('audioWasPlaying', 'false');
                    });
                }
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, volume]);

    const handleAccept = () => {
        setHasInteracted(true);
        setShowPrompt(false);
        setIsPlaying(true);
        sessionStorage.setItem('hasAnsweredAudioPrompt', 'true');
        sessionStorage.setItem('audioWasPlaying', 'true');
    };

    const handleDecline = () => {
        setHasInteracted(true);
        setShowPrompt(false);
        setIsPlaying(false);
        sessionStorage.setItem('hasAnsweredAudioPrompt', 'true');
        sessionStorage.setItem('audioWasPlaying', 'false');
    };

    const toggleAudio = () => {
        const nextState = !isPlaying;
        setIsPlaying(nextState);
        sessionStorage.setItem('audioWasPlaying', nextState.toString());
    };

    const pauseAudioThmporarily = () => {
        if (isPlaying) {
             setIsPlaying(false);
             // Lưu cờ là ta đã tạm dừng vì lý do hệ thống (như mở video)
             sessionStorage.setItem('tempPausedBySystem', 'true');
        }
    };

    const resumeAudioAfterTempPause = () => {
        const wasTempPaused = sessionStorage.getItem('tempPausedBySystem') === 'true';
        if (wasTempPaused && hasInteracted) {
             setIsPlaying(true);
             sessionStorage.removeItem('tempPausedBySystem');
        }
    };

    return (
        <AudioContext.Provider value={{
            isPlaying,
            toggleAudio,
            pauseAudioThmporarily,
            resumeAudioAfterTempPause,
            showPrompt,
            handleAccept,
            handleDecline,
            isAudioLoaded,
            audioUrl,
            audioRef
        }}>
            {/* The invisible audio element */}
            {audioUrl && (
                <audio 
                    ref={audioRef}
                    src={audioUrl}
                    loop
                    preload="auto"
                    onLoadedData={() => setIsAudioLoaded(true)}
                    onCanPlay={() => setIsAudioLoaded(true)}
                />
            )}
            {children}
        </AudioContext.Provider>
    );
};
