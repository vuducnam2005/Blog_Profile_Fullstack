import { useEffect, useRef, useState } from 'react';
import videoMp4 from '../assets/video.mp4';
import videoMov from '../assets/video.mov';

export default function VideoBackground() {
  const videoRef = useRef(null);
  const [glowActive, setGlowActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let blobUrl = null;
    let isDisposed = false;

    video.muted = true;
    video.defaultPlaybackRate = 1.0;
    if ('preservesPitch' in video) video.preservesPitch = false;
    if ('webkitPreservesPitch' in video) video.webkitPreservesPitch = false;

    // Load toàn bộ dữ liệu video vào bộ nhớ RAM Blob để chống đơ/stall 100%
    fetch(videoMp4)
      .then((res) => res.blob())
      .then((blob) => {
        if (isDisposed) return;
        blobUrl = URL.createObjectURL(blob);
        video.src = blobUrl;
        video.play().catch(() => {});
      })
      .catch(() => {
        if (!isDisposed && !video.src) {
          video.src = videoMp4;
          video.play().catch(() => {});
        }
      });

    // Bộ bảo vệ tự động phát tiếp nếu trình duyệt bị ngắt nhịp
    const handleStallOrPause = () => {
      if (!isDisposed && video.paused) {
        video.play().catch(() => {});
      }
    };

    // Tự động tua về đầu mượt mà trước khi video kết thúc (ngăn đơ khung hình cuối)
    const handleTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - 0.15) {
        video.currentTime = 0.01;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('pause', handleStallOrPause);
    video.addEventListener('waiting', handleStallOrPause);
    video.addEventListener('stalled', handleStallOrPause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    let animationFrameId = null;
    let scrollTimeoutId = null;
    let isFastForwarding = false;

    let targetY = 0;
    let currentY = 0;
    let targetScale = 1.0;
    let currentScale = 1.0;

    const setRate = (rate) => {
      if (!video) return;
      try {
        video.playbackRate = rate;
        if (video.paused) video.play().catch(() => {});
      } catch {
        // Safe fallback
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

      // Phóng to Zoom lại gần khi lăn/kéo chuột xuống (1.0x -> 1.45x)
      targetScale = 1.0 + progress * 0.45;
      targetY = -progress * 40;

      // Tua nhanh video 2.0x khi cuộn
      if (!isFastForwarding) {
        isFastForwarding = true;
        setRate(2.0);
      }

      // Ngừng lăn chuột 150ms -> Trả về 1.0x
      if (scrollTimeoutId !== null) {
        clearTimeout(scrollTimeoutId);
      }
      scrollTimeoutId = setTimeout(() => {
        isFastForwarding = false;
        setRate(1.0);
      }, 150);
    };

    const updateLoop = () => {
      // Lerp mượt 60 FPS cho Zoom lại gần & Trượt Parallax
      currentScale += (targetScale - currentScale) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (video) {
        video.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0) scale(${currentScale.toFixed(4)})`;
      }

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    // Bắt sự kiện click Tab trên Menu (gửi sự kiện resetGalaxy từ Navbar)
    const handleTabClick = () => {
      setGlowActive(true);
      const timer = setTimeout(() => setGlowActive(false), 800);
      return () => clearTimeout(timer);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resetGalaxy', handleTabClick);
    handleScroll();
    updateLoop();

    return () => {
      isDisposed = true;
      if (scrollTimeoutId !== null) clearTimeout(scrollTimeoutId);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      video.removeEventListener('pause', handleStallOrPause);
      video.removeEventListener('waiting', handleStallOrPause);
      video.removeEventListener('stalled', handleStallOrPause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resetGalaxy', handleTabClick);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className={`w-full h-full object-cover min-w-full min-h-full opacity-90 filter contrast-[1.12] saturate-[1.25] brightness-[1.05] transition-all duration-700 ease-out ${
          glowActive ? 'brightness-[1.3] saturate-[1.45]' : ''
        }`}
        style={{ transform: 'translate3d(0, 0px, 0) scale(1.0)', willChange: 'transform' }}
      >
        <source src={videoMp4} type="video/mp4" />
        <source src={videoMov} type="video/quicktime" />
      </video>
      {/* Lớp phủ phát sáng khi click Tab menu */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/60 pointer-events-none transition-opacity duration-700 ${
          glowActive ? 'opacity-40' : 'opacity-100'
        }`}
      />
    </div>
  );
}
