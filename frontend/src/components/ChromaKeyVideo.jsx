import React, { useEffect, useRef, useState } from 'react';

/**
 * Component ChromaKeyVideo
 * Nhận file video phông xanh (MP4/WebM), tự động lọc bỏ màu xanh lá (Green Screen)
 * và vẽ lên HTML5 Canvas với nền trong suốt 100%.
 */
const ChromaKeyVideo = ({ 
  src = '/avatar_AI.webm', 
  className = '', 
  width = 120, 
  height = 120,
  sensitivity = 40,
  smoothness = 20
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const processFrame = () => {
      if (!video || video.paused || video.ended) {
        animFrameId.current = requestAnimationFrame(processFrame);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Vẽ khung hình video lên canvas
      ctx.drawImage(video, 0, 0, w, h);

      // Trích xuất mảng dữ liệu điểm ảnh (pixels)
      const frame = ctx.getImageData(0, 0, w, h);
      const l = frame.data.length / 4;

      // Duyệt qua từng điểm ảnh để lọc dải màu xanh lá
      for (let i = 0; i < l; i++) {
        const idx = i * 4;
        const r = frame.data[idx];
        const g = frame.data[idx + 1];
        const b = frame.data[idx + 2];

        // Lọc màu xanh lá (Green Screen Keying)
        const maxRB = Math.max(r, b);
        const greenDiff = g - maxRB;

        if (g > 60 && greenDiff > sensitivity) {
          // Nền xanh hoàn toàn -> trong suốt 100%
          frame.data[idx + 3] = 0;
        } else if (g > 50 && greenDiff > (sensitivity - smoothness)) {
          // Viền biên mờ (Edge smoothing) -> tính độ mờ mượt mà
          const factor = (greenDiff - (sensitivity - smoothness)) / smoothness;
          frame.data[idx + 3] = Math.round(255 * (1 - factor));
          // Khử viền xanh (De-spill) bằng cách hạ màu g xuống bằng maxRB
          frame.data[idx + 1] = maxRB;
        }
      }

      // Ghi lại dữ liệu ảnh đã tách nền lên canvas
      ctx.putImageData(frame, 0, 0);

      animFrameId.current = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      animFrameId.current = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);
    video.play().catch(err => {
      console.warn("Autoplay blocked or waiting for user interaction:", err);
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [sensitivity, smoothness]);

  return (
    <div className={`relative inline-block ${className}`} style={{ width, height }}>
      {/* Video ẩn dùng làm nguồn phát */}
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
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
      />

      {/* Canvas hiển thị video đã tách nền xanh trong suốt */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_12px_rgba(241,216,158,0.3)]"
      />
    </div>
  );
};

export default ChromaKeyVideo;
