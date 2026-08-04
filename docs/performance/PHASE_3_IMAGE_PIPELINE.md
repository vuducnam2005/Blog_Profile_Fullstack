# Phase 3 - Responsive Image Pipeline

## Mục tiêu

Giảm mạnh dung lượng ảnh tải theo từng kích thước màn hình và DPR, đồng thời giữ nguyên crop bằng CSS, glow, blur nền, hover scale, AOS, lightbox và toàn bộ animation hiện có.

## Thay đổi đã triển khai

### Pipeline dùng chung

- Thêm `frontend/src/utils/media.js` để xử lý URL backend và Cloudinary thống nhất.
- Tự động thêm `f_auto,q_auto,c_limit` cho ảnh Cloudinary.
- Giữ nguyên transformation Cloudinary đã có và nối bước tối ưu ở phía sau để không thay đổi crop cũ.
- URL Cloudinary có chữ ký không bị tự ý sửa, tránh làm hỏng asset private/signed.
- Thêm helper thumbnail video Cloudinary và URL video MP4 tương thích với hành vi hiện tại.
- Thêm `frontend/src/components/OptimizedImage.jsx` để dùng chung `srcSet`, `sizes`, `loading`, `decoding` và `fetchPriority`.

### Kích thước responsive

| Vị trí | Biến thể chiều rộng |
|---|---|
| Hero avatar | 144, 288, 432 px |
| Blog card | 320, 480, 640, 960 px |
| Album masonry | 360, 540, 720, 1080 px |
| Album grid/video thumbnail | 240, 360, 480, 720 px |
| Detail và lightbox | 640, 960, 1280, 1600, 2048 px |
| Comment avatar | 36, 72, 108 px |

Trình duyệt tự chọn biến thể phù hợp dựa trên viewport, `sizes` và DPR. `c_limit` không phóng lớn ảnh vượt quá nguồn gốc.

### Chiến lược tải

- Hero avatar dùng `loading="eager"` và `fetchPriority="high"`.
- Ảnh bìa trang chi tiết dùng `loading="eager"`, `fetchPriority="high"` và có biến thể đến 2048 px cho Retina.
- Blog card, album, comment avatar và preview dưới màn hình dùng lazy loading cùng `decoding="async"`.
- Hero, blog card, album grid và preview admin đã có vùng hiển thị cố định hoặc `aspect-ratio`, tránh thay đổi layout khi ảnh tải.
- Album masonry và ảnh detail tiếp tục giữ tỷ lệ gốc; không ép tỷ lệ giả vì điều đó sẽ thay đổi bố cục/crop hiện tại. Muốn khóa CLS tuyệt đối cho media tỷ lệ tự do cần lưu thêm `width`/`height` từ Cloudinary khi upload và backfill dữ liệu cũ.

### Avatar local

| Định dạng | Dung lượng | Giảm so với PNG |
|---|---:|---:|
| PNG fallback | 200.539 byte | - |
| WebP | 15.964 byte | 92,0% |
| AVIF | 11.780 byte | 94,1% |

Hero dùng `<picture>` theo thứ tự AVIF, WebP, PNG. Kích thước và hiệu ứng avatar không thay đổi.

## Đo trực tiếp media production

Đo ngày 2026-08-04 bằng request thực tế tới Cloudinary với header hỗ trợ AVIF/WebP:

| Asset | Trước | Sau | Mức giảm |
|---|---:|---:|---:|
| Blog cover gốc -> card 320 px | 2.949.939 byte | 16.676 byte | 99,4% |
| Blog cover gốc -> card 640 px | 2.949.939 byte | 68.040 byte | 97,7% |
| Blog cover gốc -> detail 1600 px | 2.949.939 byte | 339.958 byte | 88,5% |
| Album gốc -> grid 720 px | 1.415.688 byte | 77.162 byte | 94,5% |
| Video -> thumbnail 360 x 360 | Không có thumbnail riêng | 9.732 byte | Loại bỏ tải video để dựng thumbnail |

Cloudinary trả `image/webp` trong phép đo. Trình duyệt có hỗ trợ tốt hơn có thể nhận AVIF qua `f_auto`; trình duyệt cũ vẫn nhận định dạng tương thích.

## Bảo toàn hiệu ứng

- Không thay đổi class hover scale, duration hoặc transition.
- Không thay đổi `object-cover`/`object-contain` tại từng vị trí.
- Không thay đổi cinematic blurred background ở trang chi tiết.
- Không thay đổi glow, border, shadow, AOS hoặc animation lightbox.
- Không sửa Three.js, particle, bloom, shader, video AI hoặc âm thanh.

## Xác minh

- ESLint cho toàn bộ file Phase 3: thành công.
- Unit smoke test URL Cloudinary, `srcSet` và video thumbnail: thành công.
- Frontend production build bằng Node 22.18.0 + Vite 5: thành công.
- `git diff --check`: không có lỗi whitespace.
- Đo response production Cloudinary: thành công, các biến thể card/grid giảm 94,5-99,4%.
- Kiểm thử trực quan desktop/mobile trong browser: chưa chạy được vì phiên Codex hiện không có browser khả dụng. Phần so sánh screenshot, crop và CLS thực đo được giữ trong checklist nghiệm thu đa thiết bị.

## Triển khai

Phase 3 chỉ thay đổi frontend và asset local. Có thể deploy sau backend của Phase 2. Cloudinary tạo biến thể theo URL ở request đầu và cache các lần sau.
