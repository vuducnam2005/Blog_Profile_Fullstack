# Phase 5 - AI Avatar Video Pipeline

> Cập nhật 2026-08-04: Giai đoạn 10 thay đường Safari chroma-key runtime bằng
> `avatar_AI_safari_mask_v2.mp4` đóng gói màu + alpha mask. Các asset runtime
> `avatar_AI_alpha.webm`, `avatar_AI_fallback.mp4` và `avatar_AI_poster.png`
> đã được thay bởi phiên bản v2; phần bên dưới được giữ làm lịch sử Phase 5.

## Mục tiêu

Nâng độ nét avatar AI trên mobile, desktop và màn hình Retina, đồng thời loại bỏ vòng lặp JavaScript đọc và ghi toàn bộ pixel mỗi frame. Autoplay, loop, chuyển động, drop shadow, vị trí và kích thước desktop cũ phải được giữ nguyên.

## Video nguồn

| Thuộc tính | Giá trị |
|---|---:|
| Codec | VP9 WebM |
| Kích thước | 720 x 1280 px |
| Tốc độ khung hình | 24 FPS |
| Thời lượng | 10,013 giây |
| Dung lượng | 1.844.618 byte |
| Audio | Opus stereo, không cần cho avatar muted |

Pipeline cũ vẽ video vào Canvas 2D, gọi `getImageData()`, duyệt toàn bộ pixel và gọi `putImageData()` ở mỗi frame. Khi cửa sổ chat mở, hai avatar có thể tạo hai vòng xử lý CPU song song.

## Pipeline mới

### Chrome, Edge và Firefox

- Phát trực tiếp `avatar_AI_alpha.webm` bằng thẻ video.
- VP9 alpha được tạo offline với alpha mềm và despill xanh.
- Trình duyệt giải mã và composite video mà không có vòng lặp JavaScript duyệt pixel.

### Safari và fallback

- Phát `avatar_AI_fallback.mp4` H.264 để bảo đảm khả năng giải mã trên Safari/iOS.
- Fragment shader WebGL thực hiện chroma-key trên GPU theo cùng ngưỡng của pipeline CPU cũ.
- Nếu MP4 không phát được, video nguồn WebM vẫn là source dự phòng tiếp theo.
- Nếu GPU chưa sẵn sàng hoặc gặp lỗi, poster alpha tiếp tục hiển thị để tránh khung trống hoặc nháy nền xanh.

### Lịch render và cleanup

- Ưu tiên `requestVideoFrameCallback()` để chỉ render khi decoder có frame mới; fallback về `requestAnimationFrame()` khi cần.
- Dừng video và render khi tab bị ẩn, tiếp tục khi tab hiện lại.
- Canvas dùng kích thước CSS nhân với DPR và giới hạn DPR 3 để giữ nét mà không cấp phát buffer quá mức.
- Resize dùng `ResizeObserver`; fallback resize listener là passive.
- Texture, buffer, program, callback và listener được giải phóng khi component unmount.

## Asset đầu ra

| Asset | Công dụng | Dung lượng |
|---|---|---:|
| `avatar_AI_alpha.webm` | VP9 alpha trực tiếp | 2.702.507 byte |
| `avatar_AI_fallback.mp4` | H.264 cho GPU chroma-key/Safari | 1.562.742 byte |
| `avatar_AI_poster.png` | Poster RGBA trong suốt | 503.088 byte |
| `avatar_AI.webm` | WebM fallback cuối | 1.844.618 byte |

Asset alpha lớn hơn video nguồn do phải lưu thêm mặt nạ alpha, nhưng đổi lại loại bỏ hoàn toàn bước đọc/ghi hàng triệu giá trị pixel trên main thread. File fallback MP4 đã bỏ audio và có `faststart`.

Script `frontend/scripts/generate-ai-avatar-assets.ps1` tái tạo ba asset đầu ra từ video nguồn. Script dùng công thức alpha tương đương pipeline CPU cũ, thêm despill xanh offline và không yêu cầu thêm dependency trong `package.json`; có thể truyền đường dẫn FFmpeg qua `-FfmpegPath`.

## Responsive và độ nét

| Vị trí | Kích thước CSS | Pixel cần tại DPR 3 | Nguồn |
|---|---:|---:|---:|
| Header chat | 48 x 48 | 144 x 144 | 720 x 1280 |
| Avatar nổi mobile | 112 x 127 | 336 x 381 | 720 x 1280 |
| Avatar nổi desktop | 150 x 170 | 450 x 510 | 720 x 1280 |

Avatar nổi dùng `clamp(112px, 24vw, 150px)` và `clamp(127px, 27.2vw, 170px)`. Desktop vẫn giữ đúng 150 x 170 px. `object-fill` được giữ theo baseline vì Canvas 2D cũ cũng kéo nguồn 9:16 vào khung 150:170; đổi sang `contain` sẽ làm nhân vật hẹp đi và vi phạm yêu cầu không đổi hiệu ứng/hình dáng.

## Bảo toàn hiệu ứng

- Giữ nguyên autoplay, loop, muted và playsInline.
- Giữ nguyên vị trí fixed, animation nổi, hover, glow và drop shadow của avatar.
- Giữ nguyên kích thước header 48 x 48 và kích thước desktop 150 x 170.
- Không sửa Three.js, particle, bloom, shader nền, AOS, glass blur hoặc chatbot animation.
- Không giảm FPS hoặc cắt thời lượng video.

## Xác minh

- ESLint cho `ChromaKeyVideo.jsx`, `GpuChromaKeyVideo.jsx` và `AiChatWidget.jsx`: thành công.
- Production build bằng Node 22.18.0 và Vite 5: thành công.
- FFprobe xác nhận VP9 alpha 720 x 1280, 24 FPS, `alpha_mode=1`, không audio.
- FFprobe xác nhận H.264 High 720 x 1280, 24 FPS, không audio.
- FFprobe xác nhận poster PNG 720 x 1280, pixel format RGBA.
- FFmpeg giải mã hết video nguồn, alpha và MP4 fallback mà không có lỗi.
- Script tái tạo asset chạy thành công; poster tạo lại có thống kê alpha tương đương poster phát hành.
- Kiểm tra frame alpha trên nền đen, trắng, cyan và vàng không thấy viền xanh rõ ràng.
- `getImageData()` và `putImageData()` không còn xuất hiện trong pipeline avatar AI.

## Kiểm thử còn chờ

Phiên Codex hiện không có trình duyệt khả dụng, nên chưa thể thu trace FPS/CPU/GPU hoặc đối chiếu autoplay/loop trực tiếp tại viewport 360, 390, 768, 1440 và DPR 1-3. Các kiểm tra này vẫn là điều kiện QA trước khi phát hành production; chúng không được đánh dấu đạt chỉ dựa trên build.
