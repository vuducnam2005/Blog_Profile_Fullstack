# Giai đoạn 9 - Kiểm thử tương thích

Ngày kiểm tra kỹ thuật: 2026-08-04

## Kết luận

Phần kiểm tra tự động và sửa lỗi tương thích đã hoàn thành. Phase 9 chưa được đánh dấu nghiệm thu cuối vì môi trường hiện tại không cung cấp browser runtime hoặc thiết bị thật để quan sát hình ảnh, FPS, console và tương tác.

Browser runtime đã được khởi tạo theo công cụ chuẩn nhưng trả:

```text
No browser is available
browsers.list() = []
```

Do đó Chrome desktop, Edge, Firefox, Safari, Chrome Android, Samsung Internet và Safari iOS vẫn nằm trong danh sách QA thủ công bắt buộc.

## 1. Các lỗi tương thích đã sửa

### Panel chatbot trên mobile và landscape

Panel cũ rộng cố định 350 px cộng lề phải nên có thể tràn màn hình 320 px. Chiều cao 500 px cũng vượt viewport điện thoại khi xoay ngang.

Panel mới:

- Giới hạn chiều rộng bằng `calc(100vw - 2rem)`.
- Giới hạn chiều cao bằng `calc(100vh - 180px)`.
- Dùng `100dvh` khi trình duyệt hỗ trợ để phản ứng đúng với thanh địa chỉ mobile.
- Thêm `min-h-0` cho vùng tin nhắn để flex scrolling hoạt động đúng trên Safari và viewport thấp.
- Không thay đổi backdrop blur, border, shadow, animation mở panel hoặc kích thước avatar.

Kết quả tính toán:

| Viewport | DPR | Panel tối đa | Kết quả |
| --- | ---: | ---: | --- |
| 320 x 568 | 2 | 288 x 388 | Vừa viewport |
| 360 x 640 | 3 | 328 x 460 | Vừa viewport |
| 390 x 844 | 3 | 350 x 500 | Vừa viewport |
| 844 x 390 landscape | 3 | 390 x 210 | Vừa viewport |
| 768 x 1024 | 2 | 390 x 500 | Vừa viewport |
| 1440 x 900 | 1 | 390 x 500 | Vừa viewport |

### Video alpha trên iPhone/iPad

Mọi browser iOS đều dùng WebKit. Detection mới nhận cả iPhone, iPad, iPod và iPadOS desktop mode, không chỉ Safari.

Chrome/Edge/Firefox trên iOS sẽ dùng MP4 + GPU chroma-key fallback thay vì thử VP9 alpha không tương thích. Shader, sensitivity, smoothness và độ phân giải canvas không giảm.

### WebGL context recovery

GPU avatar lắng nghe:

- `webglcontextlost`
- `webglcontextrestored`

Khi context bị mất do chuyển tab, xoay màn hình hoặc hệ điều hành thu hồi GPU, poster xuất hiện lại và WebGL pipeline được tạo lại sau restore. Video không cần reload toàn trang.

### Safari overflow fallback

`overflow-x: hidden` được đặt trước `overflow-x: clip`. Browser mới dùng `clip`; Safari/browser cũ không hiểu `clip` vẫn dùng `hidden`, tránh thanh cuộn ngang mà không thay đổi hiệu ứng.

### CORS local và LAN

Backend chuyển từ kiểm tra chuỗi domain sang kiểm tra hostname/IP chính xác.

Đã cho phép:

- `localhost`, `127.0.0.1`, IPv6 loopback.
- Private LAN `10.0.0.0/8`.
- Private LAN `172.16.0.0/12`.
- Private LAN `192.168.0.0/16`.
- `ducnamdev.site` và subdomain.
- `*.vercel.app` và `*.devtunnels.ms`.

Đã xác minh origin ngoài dải như `172.32.0.5` và domain giả `ducnamdev.site.attacker.example` không nhận CORS header.

### Lint và storage fallback

- Loại biến dịch không dùng tại maintenance overlay.
- Trạng thái mở liên kết Admin được tính trực tiếp, không setState đồng bộ trong effect.
- Auth session và đổi ngôn ngữ tiếp tục hoạt động trong memory nếu sessionStorage/localStorage bị chặn.
- Full frontend ESLint hiện đạt không lỗi.

## 2. Route, chunk và media

Vite preview trả HTTP 200 và MIME đúng cho:

- `/`
- `/cv`
- `/album`
- `/admin`
- `/post/phase-9-check`
- Entry JavaScript.
- Chatbot, Admin, CV, Album, Detail và Three.js fallback chunks.

Media hỗ trợ byte range với HTTP 206:

- `avatar_AI.webm`: `video/webm`.
- `avatar_AI_alpha.webm`: `video/webm`.
- `avatar_AI_fallback.mp4`: `video/mp4`.
- `avatar_AI_poster.png`: `image/png`.

Byte range giúp browser seek/decode video mà không bắt buộc tải lại toàn bộ file.

## 3. Mạng mô phỏng

Kiểm tra trên preview local để loại trừ ảnh hưởng internet:

| Profile | Entry 400.36 kB | Chat chunk 14.58 kB |
| --- | ---: | ---: |
| Không giới hạn | 0.005 giây | 0.003 giây |
| Fast 4G mô phỏng 400 kB/s | 0.979 giây | 0.028 giây |
| Slow 4G mô phỏng 64 kB/s | 6.045 giây | tải trong burst nhỏ |

Chat chunk vẫn chỉ được yêu cầu sau click. Vì chỉ khoảng 14.6 kB nên ảnh hưởng nhỏ ngay cả khi mạng chậm.

Backend production trả HTTP 200 cho ba mẫu config liên tiếp. TTFB quan sát được khoảng 0.39-1.00 giây. Không thể buộc Render chuyển sang cold state trong phiên kiểm tra này, vì vậy cold-start vẫn chờ kiểm tra sau deployment.

## 4. Đối chiếu hiệu ứng

Source giữ đúng baseline:

### Bloom

| Thiết bị | Strength | Strength max | Radius | Threshold |
| --- | ---: | ---: | ---: | ---: |
| Mobile | 0.58 | 0.78 | 0.24 | 0.9 |
| Tablet | 0.72 | 1.08 | 0.32 | 0.9 |
| Desktop | 0.82 | 1.08 | 0.32 | 0.9 |

### Particle

| Nhóm | Mobile | Tablet | Desktop |
| --- | ---: | ---: | ---: |
| Galaxy | 50.000 | 100.000 | 180.000 |
| Far stars | 1.000 | 2.000 | 3.000 |
| Mid dust | 600 | 1.200 | 2.000 |
| Near dust | 150 | 300 | 500 |
| Orbital | 60 | 120 | 200 |
| Light rays | 7 | 9 | 11 |
| Light ray segments | 64 | 96 | 96 |

Các điều kiện khác:

- `data-aos` vẫn có 52 token và AOS vẫn `once: false`.
- Glass usage vẫn là 11; production CSS vẫn chứa backdrop filter và hover animation.
- Chroma-key chỉ dùng WebGL `texImage2D` + `drawArrays`; không có `getImageData` hoặc `putImageData` CPU per-pixel.
- Three.js có OffscreenCanvas Worker và dynamic main-thread fallback.
- `requestVideoFrameCallback` có fallback `requestAnimationFrame`.
- `IntersectionObserver` không hỗ trợ sẽ render toàn bộ deferred sections.
- Audio element chỉ được tạo khi đã có tương tác/phiên đang phát và dùng `preload="metadata"`.
- Ảnh card dùng `srcset`, `sizes`, AVIF/WebP hoặc Cloudinary transformation khi nguồn hỗ trợ.

## 5. Build

Frontend:

- Full ESLint: đạt.
- Production build: đạt.
- Entry JavaScript: 398.41 kB, 129.22 kB gzip.
- Chat chunk: 13.44 kB, 6.24 kB gzip.
- CSS: 78.03 kB, 12.16 kB gzip.
- `git diff --check`: đạt.

Backend:

- Release build: đạt.
- Không có error.
- Còn hai warning nullable có sẵn tại `Models/BlogPost.cs`.

## 6. Các mục chưa thể nghiệm thu

- Chrome desktop, Edge và Firefox thực tế.
- Safari macOS.
- Chrome Android và Samsung Internet.
- Safari iPhone/iPad, portrait và landscape.
- Cuộn nhanh, cuộn ngược và AOS replay bằng mắt.
- FPS khi Three.js, avatar AI và scroll chạy đồng thời.
- Mở/đóng chatbot nhiều lần và gửi request Gemini thật.
- Bật/tắt nhạc, album video và chuyển tab.
- Console error/warning trong browser.
- DPR 1/2/3 bằng screenshot pixel-level.
- Cache header mới và cold start sau deployment.
- Chức năng admin có đăng nhập và dữ liệu production.

Phase 9 chỉ được đánh dấu hoàn thành cuối cùng khi các mục trên được kiểm tra trên browser/thiết bị thật và không phát hiện regression hiệu ứng.
