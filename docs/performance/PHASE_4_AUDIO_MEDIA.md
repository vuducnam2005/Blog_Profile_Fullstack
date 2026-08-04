# Phase 4 - Audio and Media Loading

## Mục tiêu

Loại bỏ việc tải nhạc nền trước khi người dùng đồng ý, chuyển playback sang buffer theo Range Request và bảo đảm video album không tải toàn bộ trước khi phát. Prompt, nút phát/dừng, loop, volume, animation và chất lượng media hiện tại phải được giữ nguyên.

## Thay đổi đã triển khai

### Audio chỉ tải sau tương tác

- `AudioProvider` không còn render thẻ `<audio>` ngay khi nhận được config.
- Trước khi người dùng đồng ý hoặc chủ động bật nhạc, DOM không có audio `src`, vì vậy trình duyệt không thể request file nhạc.
- Khi bấm đồng ý, thẻ audio mới được mount với `preload="metadata"`; `play()` để trình duyệt tự lấy các byte cần thiết và bắt đầu khi buffer đủ.
- Khi người dùng từ chối, audio không được mount. Nếu audio từng được bật theo một tương tác khác, thao tác từ chối sẽ pause và gỡ thẻ audio.
- Khi người dùng tắt nhạc thủ công, cờ tạm dừng do video được xóa để video không tự bật lại nhạc trái ý người dùng.

### Giữ trạng thái và tương thích

- Giữ nguyên prompt xuất hiện sau 1 giây.
- Giữ nguyên `loop`, volume 50%, nút bật/tắt ở desktop và mobile.
- Giữ nguyên hành vi tự tạm dừng nhạc khi phát video album và tiếp tục sau khi video pause/end.
- Đọc/ghi `sessionStorage` có fallback an toàn khi storage bị trình duyệt chặn.
- Callback và context value được ổn định bằng `useCallback`/`useMemo`, giảm render lại không cần thiết ở Navbar và Album.
- Cloudinary audio tiếp tục dùng đúng transformation `f_auto,q_auto` đã có từ baseline; Phase 4 không đổi bitrate hoặc codec nghe được.

### Video album

- Video trong Album trang chủ dùng `preload="metadata"`, không dùng `auto`.
- Video full-size trong lightbox chỉ được mount khi người dùng mở item và cũng khai báo `preload="metadata"`.
- Grid AlbumViewer và Admin tiếp tục dùng thumbnail ảnh tĩnh, không tải file video để hiển thị preview.
- URL video Cloudinary dùng biến thể MP4 xác định `f_mp4,q_auto` để tương thích Chrome, Edge, Firefox, Safari và điện thoại.
- Không trì hoãn metadata bằng placeholder tỷ lệ giả vì điều đó có thể làm thay đổi masonry layout hoặc tạo CLS; cách hiển thị/crop hiện tại được giữ nguyên.

## Số liệu production

Đo ngày 2026-08-04 trên media đang dùng thực tế:

| Hạng mục | Trước Phase 4 | Sau Phase 4 |
|---|---:|---:|
| Nhạc trước khi người dùng trả lời | Có thể tải 5.789.247 byte do `preload="auto"` | 0 byte vì chưa có audio `src` |
| Request Range mẫu sau khi đồng ý | Không được chủ động dùng | `206 Partial Content`, 65.536 byte đầu |
| Dung lượng audio gốc Cloudinary | 10.490.775 byte | Không thay đổi file gốc |
| Audio `f_auto,q_auto` hiện tại | 5.789.247 byte | Giữ nguyên để không đổi chất lượng baseline |
| Video mẫu nguồn MOV | 31.864.692 byte | MP4 `q_auto` khoảng 3.860.800 byte |
| Request Range video đã tạo biến thể | Toàn bộ file nếu preload sai | `206 Partial Content`, 65.536 byte mẫu |

Cloudinary xác nhận `Accept-Ranges: bytes` và trả `Content-Range` cho audio. Trình duyệt có thể yêu cầu các đoạn khác nhau tùy codec, cache và vị trí phát.

## Bảo toàn hiệu ứng và chất lượng

- Không sửa CSS hoặc animation của popup âm thanh.
- Không sửa icon pulse/spin, glow, backdrop blur hoặc transition của nút.
- Không sửa autoplay/controls/playsInline của video album.
- Không cắt thời lượng, sample rate hoặc bitrate bằng một pipeline mới.
- Không re-encode audio offline vì phiên hiện tại không có điều kiện nghe A/B; làm việc đó khi chưa nghe đối chiếu sẽ vi phạm yêu cầu không giảm chất lượng.

## Xác minh

- Cloudinary audio Range request: `206 Partial Content`.
- Cloudinary video MP4 sau khi tạo biến thể: `206 Partial Content`.
- ESLint cho toàn bộ file Phase 4: thành công.
- Frontend production build bằng Node 22.18.0 + Vite 5: thành công.
- Kiểm thử trực tiếp âm thanh trên browser/thiết bị thật: chưa chạy được vì phiên Codex không có browser khả dụng.

## Lưu ý vận hành

Biến thể video Cloudinary mới có thể mất thời gian tạo ở request đầu tiên; sau khi Cloudinary hoàn tất, biến thể được cache và hỗ trợ Range. Có thể bổ sung eager transformation lúc upload ở một thay đổi riêng nếu muốn loại bỏ hoàn toàn độ trễ cold transform cho video mới.
