import React, { useEffect, useRef } from 'react';

/**
 * Component ChromaKeyVideo (Siêu Tối Ưu Cực Hạn - Ultra Performance)
 * - Tốc độ quét 24 FPS (khớp đúng chuẩn video gốc, loại bỏ 60% vòng lặp thừa).
 * - Thu nhỏ độ phân giải xử lý nội bộ (Buffer Downscaling - giảm 50% số điểm ảnh phải tính toán).
 * - Thêm lớp GPU Compositing Layer (transform: translateZ(0)) giúp cuộn trang siêu mượt.
 */
const ChromaKeyVideo = ({ 
  src = '/avatar_AI.webm', 
  className = '', 
  width = 105, 
  height = 135,
  sensitivity = 38,
  smoothness = 18
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Thu nhỏ độ phân giải tính toán nội bộ (Tối ưu 50% số điểm ảnh)
  const internalWidth = Math.round(width * 0.75);
  const internalHeight = Math.round(height * 0.75);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Tốc độ khung hình 24 FPS (mỗi frame ~41.6ms) - chuẩn tốc độ chuyển động video
    const targetFpsInterval = 1000 / 24;

    const processFrame = (now) => {
      // Dừng xử lý khi tab ẩn hoặc video chưa chạy
      if (document.hidden || !video || video.paused || video.ended) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      // Giới hạn FPS cực chuẩn
      const elapsed = now - lastFrameTimeRef.current;
      if (elapsed < targetFpsInterval) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }
      lastFrameTimeRef.current = now - (elapsed % targetFpsInterval);

      const w = canvas.width;
      const h = canvas.height;

      // Vẽ khung hình video nguồn thu nhỏ mượt mà
      ctx.drawImage(video, 0, 0, w, h);

      // Trích xuất mảng điểm ảnh
      const frame = ctx.getImageData(0, 0, w, h);
      const data = frame.data;
      const len = data.length;

      // Lọc phông xanh mượt mà
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const maxRB = r > b ? r : b;
        const greenDiff = g - maxRB;

        if (g > 60 && greenDiff > sensitivity) {
          data[i + 3] = 0;
        } else if (g > 50 && greenDiff > (sensitivity - smoothness)) {
          const factor = (greenDiff - (sensitivity - smoothness)) / smoothness;
          data[i + 3] = (255 * (1 - factor)) | 0;
          data[i + 1] = maxRB;
        }
      }

      ctx.putImageData(frame, 0, 0);

      animFrameId.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      lastFrameTimeRef.current = performance.now();
      animFrameId.current = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);
    if (!video.paused) {
      handlePlay();
    } else {
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [sensitivity, smoothness]);

  return (
    <div 
      className={`relative inline-block ${className}`} 
      style={{ 
        width, 
        height, 
        transform: 'translateZ(0)', 
        willChange: 'transform' 
      }}
    >
      {/* Video nguồn ẩn */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
        onCanPlay={() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
        }}
      />

      {/* Canvas vẽ nhân vật 3D với độ phân giải nội bộ tối ưu */}
      <canvas
        ref={canvasRef}
        width={internalWidth}
        height={internalHeight}
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]"
        style={{ transform: 'translateZ(0)', willChange: 'transform' }}
      />
    </div>
  );
};

export default ChromaKeyVideo;
