# Giai đoạn 8 - Bundle và cache Vercel

Ngày hoàn thành kỹ thuật: 2026-08-04

## Mục tiêu

- Giảm JavaScript phải tải và thực thi trước khi người dùng tương tác.
- Giữ avatar AI xuất hiện và chuyển động ngay từ lần render đầu.
- Không cắt giảm AOS, Three.js, bloom, shader, particle, glass blur, video, hover hoặc glow.
- Cache dài hạn duy nhất cho tài nguyên có tên chứa content hash.
- Bảo đảm HTML và media tên cố định không bị giữ phiên bản cũ bằng `immutable`.

## 1. Tách avatar AI khỏi runtime chatbot

`AiChatLauncher.jsx` được import đồng bộ từ `App.jsx` và chịu trách nhiệm render avatar AI ngay lập tức.

- Giữ nguyên `ChromaKeyVideo` và kích thước `clamp(112px, 24vw, 150px)` x `clamp(127px, 27.2vw, 170px)`.
- Giữ nguyên `sensitivity={38}`, `smoothness={18}`, autoplay, loop, GPU chroma-key và poster fallback.
- Giữ nguyên hover scale, active scale, drop shadow, badge bounce và icon spin.
- Avatar có key ổn định và không bị unmount khi dynamic chunk được thêm vào, tránh khởi động lại video lúc mở chat.

`AiChatWidget.jsx` chỉ được import bằng `React.lazy()` sau cú bấm đầu tiên. Prompt hệ thống, lịch sử hội thoại, form chat, fallback offline và request Gemini đều nằm trong dynamic chunk này.

Sau khi đã tải, panel tiếp tục được mount khi đóng để giữ nguyên lịch sử và trạng thái nhập trong phiên hiện tại.

## 2. Kết quả bundle

Build bằng Vite 5.4.21 và Node 22:

| Tài nguyên | Cuối giai đoạn 7 | Giai đoạn 8 | Thay đổi |
| --- | ---: | ---: | ---: |
| JS entry | 423.17 kB | 397.92 kB | -25.25 kB |
| JS entry gzip | 137.18 kB | 129.11 kB | -8.07 kB |
| Chatbot dynamic chunk | 20.51 kB | 13.45 kB | -7.06 kB |
| Chatbot gzip | 8.83 kB | 6.25 kB | -2.58 kB |
| CSS entry | 77.84 kB | 77.84 kB | Không đổi |

Manifest xác nhận các dynamic entry riêng:

- `AiChatWidget`
- `Detail`
- `Admin`
- `CvViewer`
- `AlbumViewer`
- `blackHoleFallback`

HTML production chỉ module-preload `vendor-lucide` và `vendor-aos`. Chunk `AiChatWidget` không có trong HTML hoặc module-preload nên không bị tải trước cú bấm.

## 3. Dependency

Đã xóa:

- `react-quill`: không có import thực thi, chỉ còn hai dòng comment cũ trong editor và các dòng này cũng đã được dọn.
- `date-fns`: chỉ dùng cho hai mẫu ngày giờ đơn giản.

`date-fns` được thay bằng helper dùng `Intl.DateTimeFormat` native, có cache formatter và vẫn trả đúng định dạng:

- `dd/MM/yyyy HH:mm`
- `dd/MM HH:mm`
- Múi giờ `Asia/Ho_Chi_Minh` cho trang chi tiết.

Axios được giữ lại có chủ đích. Nó vẫn được dùng tại sáu nhóm source cho ETag, AbortSignal, request quản trị, upload multipart và API bài viết/bình luận. Thay toàn bộ trong giai đoạn này tăng rủi ro hồi quy mạng lớn hơn phần bundle có thể tiết kiệm.

## 4. Manual chunks

Build production tiếp tục sinh đúng các vendor chunk:

- `vendor-three`: 482.00 kB, chỉ phục vụ Three.js worker/fallback.
- `vendor-lucide`: 29.73 kB.
- `vendor-aos`: 14.42 kB JavaScript và 26.05 kB CSS.

Admin, CV, album và trang chi tiết vẫn là dynamic route chunks, không bị nhập trở lại entry chính.

## 5. Cache Vercel

`frontend/vercel.json` thiết lập:

```text
/assets/*   Cache-Control: public, max-age=31536000, immutable
/            Cache-Control: public, max-age=0, must-revalidate
/index.html  Cache-Control: public, max-age=0, must-revalidate
```

Vite chỉ đặt asset có content hash trong `/assets/*`, vì vậy deployment mới tạo URL mới và không bị cache cũ che khuất.

Các video AI trong `public/` vẫn dùng tên cố định và nằm ngoài `/assets/*`. Chúng không nhận `immutable`; trình duyệt có thể revalidate khi deployment thay đổi. API nằm ở backend riêng và không chịu quy tắc cache asset của frontend.

## 6. Brotli

Kiểm tra HTTPS trên deployment hiện tại:

- `https://www.ducnamdev.site/` trả `Content-Encoding: br`.
- JavaScript production hiện tại cũng trả `Content-Encoding: br` và MIME `application/javascript`.
- Brotli do Vercel Edge tự thương lượng từ `Accept-Encoding`; không cần thêm thư viện hoặc bước nén trong Vite.

Cấu hình `Cache-Control` mới chỉ có hiệu lực sau lần deploy tiếp theo. Khi deploy, cần xác nhận `/assets/<hash>.js` trả cả `Content-Encoding: br` và `Cache-Control: public, max-age=31536000, immutable`.

## 7. Xác minh

- Production build: đạt.
- Targeted ESLint cho toàn bộ file Phase 8: đạt.
- `git diff --check`: đạt.
- Dependency source scan: mọi dependency còn lại đều có import thực tế.
- AOS token: 52, không đổi.
- Glass JSX usage: 11, không đổi.
- Deferred section: 5, không đổi.
- CSS production: 77.84 kB, không đổi.

Full-project ESLint còn bốn lỗi có sẵn tại `MaintenanceOverlay.jsx`, `Navbar.jsx` và `AuthContext.jsx`. Các lỗi này không phát sinh từ Phase 8 và không ảnh hưởng production build.

## 8. QA còn lại

- Kiểm tra trực quan avatar không nháy khi bấm mở chat trên Chrome/Edge/Firefox và điện thoại thật.
- Kiểm tra panel chat mở/đóng nhiều lần vẫn giữ lịch sử.
- Xác nhận header cache mới sau deployment.
- Đo request waterfall cold cache để chứng minh chunk chat chỉ xuất hiện sau click.

Các mục này thuộc giai đoạn 9 kiểm thử tương thích; không phải điều kiện chặn build kỹ thuật của giai đoạn 8.
