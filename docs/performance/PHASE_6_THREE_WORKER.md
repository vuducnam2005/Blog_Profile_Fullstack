# Phase 6 - Three.js Worker and Shared Engine

## Mục tiêu

Đưa vòng dựng nền Three.js ra khỏi main thread trên trình duyệt hỗ trợ `OffscreenCanvas`, đồng thời giữ nguyên toàn bộ hình ảnh, chuyển động, particle, bloom, shader, camera zoom, meteor, parallax và phản ứng theo scroll. Trình duyệt không hỗ trợ Worker phải chạy cùng engine trên main thread thay vì nhận một phiên bản hiệu ứng bị cắt giảm.

## Kiến trúc mới

```text
main.jsx
   |
   v
performanceBridge.js
   |-- OffscreenCanvas supported --> blackHole.worker.js
   |                                      |
   |                                      v
   |                                blackHoleEngine.js
   |
   `-- unsupported/error ----------> blackHoleFallback.js
                                          |
                                          v
                                    blackHoleEngine.js
```

`index.html` hiện chỉ giữ canvas và DOM root. Toàn bộ module Three.js inline khoảng 1.200 dòng đã được chuyển sang `frontend/src/background/blackHoleEngine.js`.

## Engine dùng chung

- Worker và fallback cùng gọi `createBlackHoleEngine()`; không tồn tại bản shader hoặc config rút gọn riêng cho mobile/fallback.
- Engine nhận canvas, viewport, DPR, loại thiết bị, reduced-motion và trạng thái input từ bên ngoài.
- Scheduler dùng `requestAnimationFrame()` trong môi trường hỗ trợ và fallback timer 60 Hz trong Worker nếu API đó không có.
- `renderer.setSize(..., false)` giữ CSS canvas do trang quản lý và tương thích `OffscreenCanvas` không có thuộc tính `style`.
- Star texture dùng `OffscreenCanvas` trong Worker và canvas DOM trong fallback cũ.

## Bridge main thread

- Scroll, mouse, wheel và resize chỉ được gửi tối đa một lần trong mỗi animation frame.
- Nhiều wheel event trong cùng frame được cộng năng lượng rồi engine giới hạn theo ngưỡng cũ.
- `ResizeObserver` cập nhật `maxScroll` khi chiều cao tài liệu thay đổi do API hoặc nội dung tải muộn.
- Resize luôn dùng kích thước viewport cuối cùng và DPR hiện tại.
- `resetGalaxy` tiếp tục đưa mouse parallax về tâm như baseline.
- Visibility được gửi ngay; khi tab ẩn engine hủy callback kế tiếp và không render. Khi quay lại, delta tích lũy được bỏ để camera/particle không nhảy.

## Worker và fallback

- Worker được tạo dưới dạng module và nhận canvas qua `transferControlToOffscreen()`.
- Worker báo `ready` sau khi engine dựng cảnh và render loop khởi động.
- Nếu module Worker lỗi, WebGL trong Worker không khả dụng hoặc khởi tạo quá 12 giây, bridge terminate Worker và chạy fallback.
- Canvas đã transfer không thể lấy lại; bridge thay đúng phần tử canvas bằng một canvas mới cùng ID trước khi bật fallback.
- Safari/trình duyệt cũ không có OffscreenCanvas đi thẳng vào fallback main-thread nhưng vẫn dùng đầy đủ Three.js engine.

## Bảo toàn cấu hình hiệu ứng

Khối `CONFIG` được so sánh tự động với module inline trước khi tách. SHA-256 của hai khối sau khi chuẩn hóa indentation đều là:

```text
0C9F287C4DD1DE96F10A4451C0ADB25C9A28E5CC99865545AF1A240DCBCEECBE
```

Các giá trị quan trọng được giữ nguyên:

| Hạng mục | Mobile | Tablet | Desktop |
|---|---:|---:|---:|
| Galaxy particle | 50.000 | 100.000 | 180.000 |
| Far stars | 1.000 | 2.000 | 3.000 |
| Mid dust | 600 | 1.200 | 2.000 |
| Near dust | 150 | 300 | 500 |
| Orbital particle | 60 | 120 | 200 |
| Light rays | 7 | 9 | 11 |
| Bloom strength | 0,58 | 0,72 | 0,82 |
| Renderer DPR cap | 1,0 | 1,5 | 1,5 |

Event horizon 1,2; disk ngoài 7,5; camera `zFar=22`; `zNear=7,2`; tone mapping ACES và exposure 0,82 không thay đổi.

## GPU và cấp phát bộ nhớ

- Orbital particle không còn chạy vòng lặp JavaScript cập nhật vị trí mỗi frame.
- Các tham số radius, speed, phase, inclination và eccentricity được lưu trong `BufferAttribute` một lần.
- Vertex shader dùng đúng công thức orbit cũ với `uFlowTime`, vì vậy quỹ đạo và scroll acceleration không đổi.
- Near dust tiếp tục tái sử dụng cùng TypedArray; meteor chỉ tạo geometry/material khi spawn, không tạo mới mỗi frame.
- Các Vector dùng để dựng ribbon và camera target tiếp tục được tái sử dụng.

## Cleanup

- Gỡ mouse, wheel, scroll, resize, visibility, reset và beforeunload listener.
- Disconnect `ResizeObserver`, hủy animation frame và timeout khởi tạo.
- Worker nhận lệnh dispose và tự đóng; bridge có terminate dự phòng.
- Dispose toàn bộ geometry, material, texture, meteor, bloom pass, render pass, composer và renderer.
- WebGL context được giải phóng khi engine bị hủy.

## Kết quả build

| Bundle | Dung lượng |
|---|---:|
| Main index trước Phase 6 | 449,36 kB |
| Main index sau Phase 6 | 420,85 kB |
| Worker gồm Three.js engine | 514,02 kB |
| Fallback adapter | 31,65 kB |
| Vendor Three cho fallback | 482,00 kB |

`vendor-three` không còn được module-preload trong HTML. Trên đường Worker, Three.js được tải và thực thi trong Worker; chunk fallback và vendor Three chỉ cần khi fallback được kích hoạt.

## Xác minh

- ESLint cho toàn bộ `src/background` và `src/main.jsx`: thành công.
- Production build bằng Node 22.18.0 và Vite 5: thành công.
- Build tạo riêng Worker, fallback và vendor Three.
- Vite preview trả HTTP 200 với MIME `text/javascript` cho cả ba asset.
- `CONFIG` trước/sau có hash trùng nhau.
- Static scan xác nhận engine dùng chung không đăng ký window event và không đọc scroll/DOM mỗi frame.
- Worker và fallback đều import cùng `blackHoleEngine.js`.
- `git diff --check`: không có lỗi whitespace.

## Kiểm thử còn chờ

Phiên Codex hiện không có trình duyệt khả dụng, vì vậy chưa thể đối chiếu screenshot/video baseline hoặc đo FPS, main-thread time, GPU và memory trên Chrome/Edge/Firefox/Safari ở viewport mobile/desktop. Đây vẫn là điều kiện QA trước production; build thành công không được xem là bằng chứng hình ảnh tuyệt đối.
