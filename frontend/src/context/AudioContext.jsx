import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { PortfolioContext } from './PortfolioContext';
import { getOptimizedAudioUrl, resolveMediaUrl } from '../utils/media';

const AUDIO_PROMPT_KEY = 'hasAnsweredAudioPrompt';
const AUDIO_PLAYING_KEY = 'audioWasPlaying';
const AUDIO_TEMP_PAUSED_KEY = 'tempPausedBySystem';

function readSessionValue(key) {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeSessionValue(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch {
        // Audio vẫn hoạt động nếu storage bị chặn.
    }
}

function removeSessionValue(key) {
    try {
        sessionStorage.removeItem(key);
    } catch {
        // Audio vẫn hoạt động nếu storage bị chặn.
    }
}

// eslint-disable-next-line react-refresh/only-export-components
export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const { data } = useContext(PortfolioContext);
    const backgroundMusic = data?.hero?.backgroundMusic;
    const audioUrl = useMemo(() => {
        if (!backgroundMusic) return null;
        return getOptimizedAudioUrl(resolveMediaUrl(backgroundMusic));
    }, [backgroundMusic]);

    const [isPlaying, setIsPlaying] = useState(() => (
        readSessionValue(AUDIO_PROMPT_KEY) === 'true'
        && readSessionValue(AUDIO_PLAYING_KEY) === 'true'
    ));
    const [showPrompt, setShowPrompt] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(() => (
        readSessionValue(AUDIO_PROMPT_KEY) === 'true'
    ));
    const [shouldLoadAudio, setShouldLoadAudio] = useState(() => (
        readSessionValue(AUDIO_PROMPT_KEY) === 'true'
        && readSessionValue(AUDIO_PLAYING_KEY) === 'true'
    ));
    const [isAudioLoaded, setIsAudioLoaded] = useState(false);
    const audioRef = useRef(null);
    const volume = 0.5;

    // Chỉ hiện prompt; chưa tạo thẻ audio và chưa gắn src ở bước này.
    useEffect(() => {
        if (!audioUrl || hasInteracted) return undefined;

        const timer = window.setTimeout(() => {
            setShowPrompt(true);
        }, 1000);

        return () => window.clearTimeout(timer);
    }, [audioUrl, hasInteracted]);

    // Khi người dùng cho phép, play() để trình duyệt tự buffer theo Range Request.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !shouldLoadAudio) return undefined;

        audio.volume = volume;

        if (!isPlaying) {
            audio.pause();
            return undefined;
        }

        let active = true;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch((error) => {
                if (!active) return;
                console.warn('Auto-play was prevented:', error);
                setIsPlaying(false);
                writeSessionValue(AUDIO_PLAYING_KEY, 'false');
            });
        }

        return () => {
            active = false;
        };
    }, [audioUrl, isPlaying, shouldLoadAudio]);

    const handleAccept = useCallback(() => {
        setHasInteracted(true);
        setShowPrompt(false);
        setIsAudioLoaded(false);
        setShouldLoadAudio(true);
        setIsPlaying(true);
        writeSessionValue(AUDIO_PROMPT_KEY, 'true');
        writeSessionValue(AUDIO_PLAYING_KEY, 'true');
    }, []);

    const handleDecline = useCallback(() => {
        setHasInteracted(true);
        setShowPrompt(false);
        setIsPlaying(false);
        setShouldLoadAudio(false);
        removeSessionValue(AUDIO_TEMP_PAUSED_KEY);
        writeSessionValue(AUDIO_PROMPT_KEY, 'true');
        writeSessionValue(AUDIO_PLAYING_KEY, 'false');
    }, []);

    const toggleAudio = useCallback(() => {
        if (!audioUrl) return;

        const nextState = !isPlaying;
        if (nextState) {
            setIsAudioLoaded(false);
            setShouldLoadAudio(true);
        } else {
            removeSessionValue(AUDIO_TEMP_PAUSED_KEY);
        }
        setIsPlaying(nextState);
        writeSessionValue(AUDIO_PLAYING_KEY, nextState.toString());
    }, [audioUrl, isPlaying]);

    const pauseAudioThmporarily = useCallback(() => {
        setIsPlaying((currentState) => {
            if (!currentState) return currentState;
            writeSessionValue(AUDIO_TEMP_PAUSED_KEY, 'true');
            return false;
        });
    }, []);

    const resumeAudioAfterTempPause = useCallback(() => {
        const wasTempPaused = readSessionValue(AUDIO_TEMP_PAUSED_KEY) === 'true';
        if (!wasTempPaused || !hasInteracted) return;

        setShouldLoadAudio(true);
        setIsPlaying(true);
        removeSessionValue(AUDIO_TEMP_PAUSED_KEY);
    }, [hasInteracted]);

    const contextValue = useMemo(() => ({
        isPlaying,
        toggleAudio,
        pauseAudioThmporarily,
        resumeAudioAfterTempPause,
        showPrompt,
        handleAccept,
        handleDecline,
        isAudioLoaded,
        audioUrl,
        audioRef,
    }), [
        audioUrl,
        handleAccept,
        handleDecline,
        isAudioLoaded,
        isPlaying,
        pauseAudioThmporarily,
        resumeAudioAfterTempPause,
        showPrompt,
        toggleAudio,
    ]);

    return (
        <AudioContext.Provider value={contextValue}>
            {shouldLoadAudio && audioUrl && (
                <audio
                    key={audioUrl}
                    ref={audioRef}
                    src={audioUrl}
                    loop
                    preload="metadata"
                    onLoadStart={() => setIsAudioLoaded(false)}
                    onCanPlay={() => setIsAudioLoaded(true)}
                    onPlaying={() => setIsAudioLoaded(true)}
                    onError={() => setIsAudioLoaded(false)}
                />
            )}
            {children}
        </AudioContext.Provider>
    );
};
