import { useEffect, useRef, useState } from 'react';

const DEFAULT_ALPHA_SRC = '/avatar_AI_alpha_v3.webm';
const DEFAULT_ANIMATED_WEBP_SRC = '/avatar_AI_mobile_v4.webp';
const DEFAULT_POSTER_SRC = '/avatar_AI_poster_v3.png';

function supportsNativeVp9Alpha() {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false;

  const video = document.createElement('video');
  const supportsVp9 = video.canPlayType('video/webm; codecs="vp9"') !== '';
  const userAgent = navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|CriOS|Edg|OPR|Android/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return supportsVp9 && !isSafari && !isIOS;
}

function toCssSize(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

const ChromaKeyVideo = ({
  className = '',
  width = 105,
  height = 135,
  alphaSrc = DEFAULT_ALPHA_SRC,
  animatedWebpSrc = DEFAULT_ANIMATED_WEBP_SRC,
  posterSrc = DEFAULT_POSTER_SRC,
}) => {
  const videoRef = useRef(null);
  const [renderMode, setRenderMode] = useState(() => (
    supportsNativeVp9Alpha() ? 'alpha' : 'animated-webp'
  ));

  useEffect(() => {
    if (renderMode !== 'alpha') return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [renderMode]);

  return (
    <div
      className={`relative inline-block shrink-0 ${className}`}
      style={{
        width: toCssSize(width),
        height: toCssSize(height),
        transform: 'translateZ(0)',
      }}
    >
      {renderMode === 'alpha' ? (
        <video
          ref={videoRef}
          src={alphaSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
          onCanPlay={() => videoRef.current?.play().catch(() => {})}
          onError={() => setRenderMode('animated-webp')}
        />
      ) : renderMode === 'animated-webp' ? (
        <img
          src={animatedWebpSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable="false"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
          onError={() => setRenderMode('poster')}
        />
      ) : (
        <img
          src={posterSrc}
          alt=""
          aria-hidden="true"
          draggable="false"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
        />
      )}
    </div>
  );
};

export default ChromaKeyVideo;
