# Phase 7 - DOM, AOS and Scroll Rendering

## Mục tiêu

Giảm React render, layout và paint khi cuộn mà không thay đổi AOS, hover, glow, backdrop blur, glass card hoặc cách các section xuất hiện. Các section phải được dựng đủ sớm để người dùng không nhìn thấy placeholder, nhảy layout hoặc animation AOS bị trễ.

## Scroll progress trên compositor

Pipeline cũ cập nhật React state ở mọi scroll event và thay đổi CSS `width`, khiến component render lại và có thể kích hoạt layout.

Pipeline mới:

- Thanh progress luôn có `width: 100%`.
- Tiến độ dùng `transform: scaleX()` với `transform-origin: left`.
- Scroll event chỉ lên lịch một `requestAnimationFrame()`; nhiều event trong cùng frame được gom lại.
- DOM được cập nhật trực tiếp qua ref, không gọi `setState()` khi cuộn.
- Listener scroll/resize tiếp tục là passive.
- `ResizeObserver` cập nhật lại progress khi chiều cao tài liệu đổi do API hoặc nội dung động.
- `will-change: transform` chỉ được bật trong lúc cuộn và tự xóa sau 180 ms.
- Gradient, chiều cao 3 px, glow, easing và transition 100 ms được giữ nguyên.

## Content visibility

Năm section dưới Hero sử dụng class `deferred-section`:

| Section | Intrinsic mobile | Intrinsic tablet | Intrinsic desktop |
|---|---:|---:|---:|
| About | 1.250 px | 950 px | 900 px |
| Experience | 1.700 px | 1.250 px | 1.050 px |
| Projects | 1.350 px | 1.000 px | 900 px |
| Blog | 2.200 px | 1.450 px | 1.100 px |
| Contact | 720 px | 650 px | 620 px |

CSS dùng `contain-intrinsic-size: auto <estimate>`. Estimate giữ ổn định scrollbar ở lần đầu; từ khóa `auto` cho phép trình duyệt nhớ kích thước thật sau khi section đã render.

Hero không dùng content visibility vì đây là vùng LCP và phải xuất hiện ngay. Admin, Detail, modal và lightbox cũng không bị áp dụng containment ngoài ý muốn.

## Render sớm cho AOS

`useDeferredSections()` quan sát các section bằng `IntersectionObserver` với root margin 1.400 px:

- Khi section còn cách viewport khoảng 1.400 px, hook đặt `data-render-ready="true"`.
- CSS chuyển section từ `content-visibility: auto` sang `visible` trước khi người dùng nhìn thấy.
- Hook gọi `AOS.refreshHard()` trong animation frame kế tiếp để AOS đo đúng offset thật.
- Section được unobserve nhưng giữ visible trong phần còn lại của phiên; cuộn ngược không kích hoạt containment lại.
- Trình duyệt không hỗ trợ IntersectionObserver sẽ render toàn bộ section, giữ chức năng và hiệu ứng đầy đủ.

Cách này bảo đảm `content-visibility` chỉ cắt paint ở vùng thực sự xa. Khi card/glow/blur có khả năng xuất hiện trên màn hình, paint containment đã được gỡ.

## AOS và will-change

- Cấu hình AOS vẫn là duration 1.000 ms và `once: false`.
- Tổng số `data-aos` vẫn là 52.
- Listener `aos:in` và `aos:out` bật `will-change: transform, opacity` ngay trước transition.
- Thời gian giữ layer được tính từ transition duration + delay thực tế của từng element.
- Sau transition, inline `will-change` được trả về giá trị ban đầu để trình duyệt giải phóng layer.
- Khi component cleanup, toàn bộ timer/listener được gỡ và style được phục hồi.

## Glass và glow

- `.glass` vẫn dùng `bg-white/5`, `backdrop-blur-md`, border và shadow cũ.
- Chỉ bổ sung `isolation: isolate` để card có stacking context độc lập.
- Không thêm `contain: paint`, `overflow: hidden` hoặc transform cố định vào glass.
- Các overflow cũ ở Hero, Blog, Projects và Album được giữ nguyên vì chúng đang chủ động crop media/glow nội bộ.
- Deferred section chuyển sang `content-visibility: visible` từ xa nên containment không cắt shadow hoặc backdrop blur khi nhìn thấy.

## Kết quả build

| Asset | Trước Phase 7 | Sau Phase 7 |
|---|---:|---:|
| Main JS | 420,85 kB | 423,17 kB |
| Main CSS | 76,67 kB | 77,84 kB |

Phần tăng nhỏ chứa IntersectionObserver controller, AOS layer lifecycle và intrinsic-size rules. Đổi lại scroll progress không còn gây React render/layout theo từng event và các section xa không cần layout/paint đầy đủ.

## Xác minh

- ESLint cho App, ScrollProgressBar, hook deferred, Home và các section Phase 7: thành công.
- `BlogSection.jsx` sạch lint khi bỏ qua duy nhất rule `react-hooks/set-state-in-effect` đã tồn tại ở effect tải comment trước Phase 7.
- Production build bằng Node 22.18.0 và Vite 5: thành công.
- CSS production chứa `content-visibility`, `contain-intrinsic-size`, `isolation` và vẫn chứa backdrop blur.
- Static scan xác nhận ScrollProgressBar không còn state hoặc cập nhật width.
- Số AOS attribute và glass class không thay đổi: 52 và 11.
- `git diff --check`: không có lỗi whitespace.

## Kiểm thử còn chờ

Phiên Codex hiện không có trình duyệt khả dụng nên chưa thể đo CLS, FPS, layout/paint time hoặc đối chiếu trực quan AOS chạy lại và glass blur trên Chrome/Safari/mobile. Đây vẫn là bước QA bắt buộc trước production; source/build checks không thay thế kiểm thử thiết bị thật.
