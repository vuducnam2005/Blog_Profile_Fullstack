# Kế hoạch tối ưu hiệu năng Blog Profile

## 1. Mục tiêu và nguyên tắc bắt buộc

Mục tiêu của kế hoạch là làm website tải nhanh hơn, cuộn mượt hơn và phản hồi tốt hơn trên cả điện thoại lẫn máy tính, đồng thời **không cắt giảm bất kỳ hiệu ứng hiện có nào**.

Các nguyên tắc bắt buộc:

- Giữ nguyên số lượng particle, bloom, shader, màu sắc và chuyển động của Three.js.
- Giữ hiệu ứng zoom theo scroll, mouse parallax, sao băng và các lớp bụi.
- Giữ glass blur, animation AOS và hành vi animation chạy lại khi cuộn.
- Giữ avatar AI tự động chuyển động trên cả mobile và desktop.
- Không giảm chất lượng ảnh nhìn thấy hoặc chất lượng âm thanh.
- Thiết bị hoặc trình duyệt không hỗ trợ công nghệ mới phải có fallback giữ nguyên chức năng và hiệu ứng.
- Mỗi nhóm thay đổi phải được kiểm thử độc lập để có thể hoàn tác mà không ảnh hưởng nhóm khác.

## 2. Mục tiêu hiệu năng

- Nội dung Hero xuất hiện ngay, không chờ API backend.
- Giảm dữ liệu tải lần đầu từ hơn 13 MB xuống khoảng 800 KB-1.5 MB, tùy thiết bị và nội dung.
- LCP mục tiêu dưới 2.5 giây trong điều kiện mạng di động hợp lý.
- INP mục tiêu dưới 200 ms.
- CLS dưới 0.1.
- Không còn long task do xử lý chroma-key từng pixel trên CPU.
- Không tải ảnh gốc nhiều megapixel vào các card nhỏ.
- Không tải toàn bộ nhạc nền trước khi người dùng đồng ý phát.
- Không phát sinh lỗi giao diện khi xoay màn hình, resize hoặc thay đổi DPR.

## 3. Giai đoạn 1 - Đo baseline và khóa mẫu hiệu ứng

**Trạng thái:** Baseline kỹ thuật đã hoàn thành và đủ điều kiện cho các phase không tác động hình ảnh. Screenshot/FPS bằng trình duyệt được chuyển sang bước kiểm thử bắt buộc trước khi sửa Three.js hoặc video AI. Báo cáo được lưu tại `docs/performance/BASELINE_2026-08-04.md`.

### Công việc

- [x] Build bản production hiện tại và lưu kích thước bundle.
- [x] Ghi lại tài nguyên mạng, tổng dung lượng tải tiềm năng và thời gian phản hồi API.
- [ ] Ghi lại LCP, INP, CLS và long task bằng phiên trình duyệt kiểm thử.
- [ ] Ghi lại FPS, CPU, GPU và bộ nhớ khi đứng yên, cuộn và mở chatbot.
- [ ] Chụp ảnh tham chiếu tại các vị trí Hero, About, Experience, Projects, Blog và Contact.
- [ ] Quay video tham chiếu cho background Three.js, AOS, scroll zoom và avatar AI.
- [x] Lưu lại giá trị cấu hình particle, bloom, camera, shader, pixel ratio và checksum các file trọng yếu.

### Kích thước kiểm thử

| Nhóm thiết bị | Kích thước tham chiếu | DPR |
|---|---:|---:|
| Mobile nhỏ | 360 x 800 | 2-3 |
| Mobile phổ biến | 390 x 844 | 2-3 |
| Mobile lớn | 430 x 932 | 2-3 |
| Tablet | 768 x 1024 | 2 |
| Laptop | 1366 x 768 | 1-1.5 |
| Desktop | 1920 x 1080 | 1-2 |

### Điều kiện hoàn thành

- Có đủ dữ liệu và hình ảnh để so sánh trước/sau.
- Có checklist xác nhận không mất hiệu ứng trong các giai đoạn tiếp theo.

## 4. Giai đoạn 2 - Tối ưu luồng dữ liệu khởi động

**Trạng thái:** Đã triển khai trong source. Cần deploy backend trước frontend để `commentCount` và ETag hoạt động đồng bộ trên production.

### Công việc

- [x] Render ngay dữ liệu từ `localStorage` hoặc `defaultData` thay vì chặn toàn bộ UI bằng `configReady`.
- [x] Fetch config mới trong nền theo mô hình stale-while-revalidate.
- [x] Loại bỏ timestamp phá cache khỏi request config.
- [x] Dedupe các request trùng lặp.
- [x] Hủy request GET bằng `AbortController` khi component unmount hoặc route thay đổi.
- [x] Thay polling 10 giây bằng ETag, revalidate có giới hạn và polling 60 giây khi tab hiển thị.
- [ ] Tách maintenance flag sang Vercel Edge nếu sau này yêu cầu đồng bộ tức thời giữa các thiết bị khác nhau.
- [x] Gộp số lượng comment vào API danh sách bài viết để loại bỏ N+1 request.

### Bảo toàn hiệu ứng

- Không thay đổi component, màu sắc hoặc animation.
- Chỉ thay đổi thời điểm và cách dữ liệu được đồng bộ.

### Điều kiện hoàn thành

- Hero hiển thị ngay cả khi backend Render đang cold start.
- Không có nhiều request config đồng thời.
- Số request comment không tăng tuyến tính theo số bài viết.

## 5. Giai đoạn 3 - Pipeline ảnh responsive

**Trạng thái:** Đã triển khai trong source và xác minh bằng lint, production build cùng request Cloudinary thực tế. Báo cáo tại `docs/performance/PHASE_3_IMAGE_PIPELINE.md`. Kiểm thử trực quan desktop/mobile và CLS thực đo còn chờ phiên browser khả dụng.

### Công việc

- [x] Tạo helper hoặc component ảnh dùng chung cho Cloudinary.
- [x] Tự động thêm `f_auto,q_auto,c_limit` vào URL ảnh Cloudinary.
- [x] Sinh các biến thể 320, 640, 960, 1280 và 1600 px.
- [x] Khai báo `srcSet` và `sizes` phù hợp cho blog, album, Hero và trang chi tiết.
- [x] Dùng `loading="lazy"` và `decoding="async"` cho ảnh dưới màn hình.
- [x] Dùng `fetchPriority="high"` cho ảnh LCP ở Hero nếu ảnh đó là phần tử LCP.
- [x] Khai báo `width`, `height` hoặc `aspect-ratio` cho các vùng có hình học cố định; media masonry tỷ lệ tự do cần metadata nguồn để khóa CLS tuyệt đối mà không đổi crop.
- [x] Chuyển avatar local sang WebP/AVIF nhưng giữ PNG fallback nếu cần.
- [x] Đảm bảo trang chi tiết vẫn tải ảnh đủ lớn cho màn hình Retina.

### Bảo toàn chất lượng

- Mobile nhận ảnh đúng kích thước theo DPR, không dùng ảnh mờ.
- Desktop và Retina có biến thể 2x hoặc 3x khi cần.
- Không thay đổi crop, tỷ lệ, màu hoặc cách hiển thị hiện tại.

### Điều kiện hoàn thành

- Card nhỏ không còn tải ảnh gốc 2-3 MB.
- Ảnh vẫn sắc nét ở DPR 1, 2 và 3.
- Không xuất hiện CLS khi ảnh tải xong.

## 6. Giai đoạn 4 - Tối ưu âm thanh và media

**Trạng thái:** Đã triển khai lazy audio và streaming Range trong source. Lần tải đầu không còn gắn audio `src` trước khi người dùng đồng ý. Báo cáo tại `docs/performance/PHASE_4_AUDIO_MEDIA.md`. Kiểm thử nghe A/B và kiểm thử thiết bị thật còn chờ browser/thiết bị phù hợp.

### Công việc

- [x] Không gắn `src` nhạc nền trước khi người dùng đồng ý phát.
- [x] Chuyển từ tải toàn bộ sang streaming theo Range Request.
- [x] Giữ nguyên hành vi prompt và trạng thái phát/dừng hiện tại.
- [ ] Re-encode âm thanh với codec và bitrate mới: chủ động chưa thực hiện vì chưa có kiểm thử nghe A/B và không được phép giảm chất lượng.
- [x] Đảm bảo video album chỉ preload metadata và không tự tải toàn bộ khi chưa phát.

### Điều kiện hoàn thành

- Lần tải đầu không tải trước file nhạc khoảng 5.8 MB.
- Sau khi bấm đồng ý, nhạc bắt đầu phát khi có đủ buffer thay vì chờ tải toàn bộ.
- Chất lượng nghe không suy giảm đáng nhận biết.

## 7. Giai đoạn 5 - Nâng cấp video icon AI

### Mục tiêu

- Avatar AI sắc nét trên điện thoại, desktop và màn hình Retina.
- Không có viền xanh, răng cưa hoặc canvas bị mờ.
- Giữ nguyên autoplay, loop, chuyển động và vị trí hiện tại.
- Không còn xử lý `getImageData()` và `putImageData()` trên CPU mỗi frame.

### Pipeline video mới

```text
Video nguồn chất lượng cao
        |
        v
Tách phông xanh và despill offline
        |
        +--> VP9 WebM alpha cho Chrome, Edge và Firefox
        |
        +--> HEVC alpha cho Safari nếu trình duyệt hỗ trợ
        |
        +--> GPU chroma-key fallback cho trình duyệt còn lại
```

### Độ phân giải mục tiêu

| Vị trí | Kích thước CSS dự kiến | Nguồn tối thiểu cho DPR 3 |
|---|---:|---:|
| Icon trong header chat | 48 x 48 | 144 x 144 |
| Avatar nổi mobile | khoảng 110 x 125 | 330 x 375 |
| Avatar nổi desktop | 150 x 170 | 450 x 510 |

### Công việc

- [x] Kiểm tra độ phân giải, FPS, codec và bitrate của video nguồn hiện tại.
- [x] Tách nền xanh offline với alpha mềm và xử lý despill để loại viền xanh.
- [x] Xuất video alpha, video fallback và poster 720 x 1280, đủ ngân sách pixel cho mobile, desktop và Retina DPR 3.
- [x] Dùng video alpha trực tiếp thay cho canvas chroma-key CPU trên Chrome, Edge và Firefox.
- [x] Thêm poster trong suốt độ phân giải cao để tránh nháy khi video chưa sẵn sàng.
- [x] Giữ `object-fill` và tỷ lệ khung hiển thị cũ để hình dáng avatar không thay đổi so với canvas baseline.
- [x] Dùng CSS `clamp()` để avatar thay đổi kích thước linh hoạt theo viewport.
- [x] Dùng cùng URL asset/cache để tránh tải lại video khi mở chat.
- [x] Nếu alpha video không được hỗ trợ, dùng fragment shader GPU để chroma-key.
- [x] Canvas fallback dùng kích thước vật lý bằng CSS size nhân với `devicePixelRatio`, giới hạn tại DPR 3.

### Điều kiện hoàn thành

- Avatar sắc nét ở DPR 1, 2 và 3.
- Không có viền xanh rõ ràng ở tóc, tay và mép quần áo.
- Không có vòng lặp JavaScript duyệt toàn bộ pixel mỗi frame.
- Mobile và desktop vẫn có đầy đủ chuyển động giống bản tham chiếu.

### Trạng thái thực hiện

- Mã nguồn, asset, ESLint, giải mã video và production build đã đạt ngày 2026-08-04.
- Kiểm tra khung alpha trên nền đen, trắng, cyan và vàng không thấy viền xanh rõ ràng.
- Kiểm thử FPS và đối chiếu chuyển động trực tiếp trên trình duyệt/thiết bị thật vẫn nằm trong checklist nghiệm thu đa thiết bị vì phiên Codex hiện không có trình duyệt khả dụng.

## 8. Giai đoạn 6 - Tách và tối ưu Three.js

### Cấu trúc dự kiến

```text
frontend/src/background/
|-- blackHoleEngine.js
|-- blackHole.worker.js
|-- blackHoleFallback.js
|-- performanceBridge.js
`-- shaders/
```

### Công việc

- [x] Chuyển mã Three.js ra khỏi `index.html` thành `blackHoleEngine.js` riêng.
- [x] Dùng chung một code path cho Worker và fallback để tránh sai khác hiệu ứng.
- [x] Dùng `OffscreenCanvas` và Web Worker khi trình duyệt hỗ trợ.
- [x] Fallback về main thread khi không hỗ trợ OffscreenCanvas hoặc Worker khởi tạo lỗi.
- [x] Gom mouse, scroll, wheel và resize tối đa một lần mỗi animation frame trước khi gửi sang Worker.
- [x] Giữ nguyên toàn bộ giá trị particle, bloom, camera, shader và pixel ratio; hash CONFIG sau khi tách trùng baseline.
- [x] Chuyển phép tính quỹ đạo orbital particle sang vertex shader GPU bằng đúng công thức cũ.
- [x] Tái sử dụng TypedArray, Vector và object trong animation loop.
- [x] Không cấp phát geometry hoặc material mới trong mỗi frame.
- [x] Throttle resize bằng `requestAnimationFrame` nhưng vẫn cập nhật đúng kích thước cuối.
- [x] Dừng animation callback và render khi tab ẩn, tiếp tục đúng trạng thái khi tab hiện lại.
- [x] Cleanup đầy đủ listener, Worker, texture, geometry, material, pass, composer và renderer.

### Các hiệu ứng bắt buộc giữ nguyên

- Galaxy particle: 50.000 mobile, 100.000 tablet, 180.000 desktop.
- UnrealBloomPass và bloom strength hiện tại.
- Event horizon, accretion disk, Einstein ring và lens arc.
- Far stars, mid dust, near dust, orbital particle và light ray.
- Meteor, camera zoom, rotation boost và mouse parallax.
- Màu sắc, kích thước, tốc độ và phản ứng theo scroll.

### Điều kiện hoàn thành

- Hình ảnh đối chiếu không khác đáng kể so với baseline.
- React và thao tác cuộn không bị vòng lặp Three.js chiếm main thread trên trình duyệt hỗ trợ Worker.
- Trình duyệt không hỗ trợ Worker vẫn hiển thị đầy đủ hiệu ứng.

### Trạng thái thực hiện

- Engine, Worker, fallback, bridge input, ESLint, production build và preview asset đã đạt ngày 2026-08-04.
- `CONFIG` trước và sau khi tách có cùng SHA-256 `0C9F287C4DD1DE96F10A4451C0ADB25C9A28E5CC99865545AF1A240DCBCEECBE` sau khi chuẩn hóa indentation.
- Kiểm thử hình ảnh/FPS thực tế trên Chrome, Edge, Firefox, Safari và thiết bị mobile vẫn nằm trong checklist nghiệm thu đa thiết bị vì phiên Codex hiện không có trình duyệt khả dụng.

## 9. Giai đoạn 7 - Tối ưu DOM, AOS và scroll

### Công việc

- [x] Chuyển scroll progress từ cập nhật `width` sang `transform: scaleX()`.
- [x] Dùng `requestAnimationFrame` để gom cập nhật scroll progress và không set React state khi cuộn.
- [x] Tiếp tục dùng passive listener cho `scroll`, `resize` và `wheel` phù hợp.
- [x] Thêm `content-visibility: auto` cho About, Experience, Projects, Blog và Contact.
- [x] Thêm `contain-intrinsic-size: auto <size>` responsive theo từng section để dùng estimate lần đầu và nhớ kích thước thật sau khi render.
- [x] Giữ AOS `once: false` để animation tiếp tục chạy lại khi cuộn.
- [x] Force-render section từ 1.400px trước viewport rồi gọi `AOS.refreshHard()` để animation không xuất hiện muộn.
- [x] Chỉ bật `will-change: transform, opacity` trong thời gian transition AOS đang chạy.
- [x] Dùng `isolation: isolate` cho glass nhưng giữ nguyên `backdrop-blur-md`.
- [x] Gỡ paint containment trước khi section vào viewport; không thêm overflow hoặc contain làm cắt glow/blur.

### Điều kiện hoàn thành

- Thanh progress không gây React render trên từng scroll event.
- Tất cả animation AOS vẫn chạy đúng như baseline.
- Glass blur không thay đổi hình ảnh.
- Không xuất hiện giật hoặc nhảy layout khi section dưới màn hình được render.

### Trạng thái thực hiện

- Scroll compositor, deferred sections, AOS controller, glass isolation, targeted ESLint và production build đã đạt ngày 2026-08-04.
- Số `data-aos` vẫn là 52, số class `glass` trong JSX vẫn là 11 và AOS vẫn cấu hình `once: false`.
- Kiểm thử trực quan AOS chạy lại, backdrop blur, glow clipping và CLS thực tế vẫn nằm trong checklist đa thiết bị vì phiên Codex hiện không có trình duyệt khả dụng.

## 10. Giai đoạn 8 - Bundle và cache Vercel

### Công việc

- [x] Tách avatar AI luôn hiển thị khỏi phần logic chatbot chỉ cần sau khi bấm.
- [x] Lazy-load logic chat, lịch sử và request AI nhưng không trì hoãn avatar chuyển động.
- [x] Giữ route admin, CV, album và trang chi tiết ở chunk riêng.
- [x] Kiểm tra lại manual chunk của Three.js, Lucide và AOS.
- [x] Xóa dependency không sử dụng như `react-quill` sau khi xác nhận không còn import thực thi.
- [x] Thay `date-fns` bằng `Intl.DateTimeFormat`; giữ Axios vì vẫn phục vụ ETag, upload, hủy request và nhiều route.
- [x] Cấu hình `Cache-Control: public, max-age=31536000, immutable` cho `/assets/*` có hash.
- [x] Không cache immutable cho HTML, API hoặc media không có version/hash.
- [x] Giữ video AI tên cố định ngoài `/assets/*`, vì vậy video không bị cache immutable khi chưa có hash nội dung.
- [x] Xác nhận Brotli tiếp tục hoạt động trên Vercel.

### Điều kiện hoàn thành

- Asset có hash được browser cache dài hạn.
- Deployment mới vẫn cập nhật HTML ngay.
- Chatbot không làm tăng đáng kể JavaScript lần tải đầu.
- Không có dependency không dùng trong production bundle.

### Trạng thái thực hiện

- Hoàn thành kỹ thuật ngày 2026-08-04; báo cáo chi tiết tại `docs/performance/PHASE_8_BUNDLE_VERCEL_CACHE.md`.
- JS entry giảm từ `423.17 kB` (`137.18 kB gzip`) xuống `397.92 kB` (`129.11 kB gzip`).
- Runtime chatbot là dynamic chunk `13.45 kB` (`6.25 kB gzip`), không xuất hiện trong `modulepreload` và chỉ render sau lần bấm đầu tiên.
- Avatar AI vẫn nằm trong entry, giữ nguyên kích thước responsive, autoplay, loop, chroma-key GPU, hover, badge bounce và icon spin.
- Cấu hình cache mới cần được xác nhận lại trên response production sau lần deploy tiếp theo; deployment hiện tại đã xác nhận `Content-Encoding: br` cho HTML và JavaScript.

## 11. Giai đoạn 9 - Kiểm thử tương thích

### Trình duyệt và thiết bị

- [ ] Chrome desktop.
- [ ] Edge desktop.
- [ ] Firefox desktop.
- [ ] Safari macOS nếu có thiết bị kiểm thử.
- [ ] Chrome Android.
- [ ] Samsung Internet.
- [ ] Safari iPhone và iPad.

### Kịch bản kiểm thử

- [ ] Mở trang lần đầu khi chưa có cache.
- [ ] Mở trang lần hai khi đã có cache.
- [x] Backend bình thường.
- [ ] Backend cold start sau deployment mới.
- [ ] Cuộn nhanh liên tục từ đầu đến cuối trang.
- [ ] Cuộn ngược để kiểm tra AOS chạy lại.
- [ ] Di chuyển chuột để kiểm tra parallax.
- [ ] Mở và đóng chatbot nhiều lần.
- [ ] Kiểm tra đồng thời avatar AI, Three.js và scroll.
- [ ] Bật/tắt nhạc và phát video album.
- [ ] Chuyển tab rồi quay lại.
- [ ] Xoay điện thoại dọc/ngang.
- [ ] Resize cửa sổ desktop liên tục.
- [ ] Kiểm tra mạng Fast 4G, Slow 4G và Wi-Fi.
- [ ] Kiểm tra DPR 1, 2 và 3.

## 12. Tiêu chí nghiệm thu cuối cùng

- [ ] Không thiếu hoặc giảm bất kỳ hiệu ứng nào so với baseline.
- [x] Particle count, bloom và shader giữ nguyên cấu hình theo baseline source.
- [ ] AOS vẫn chạy lại khi cuộn lên/xuống.
- [ ] Glass blur và các animation hover giữ nguyên.
- [ ] Avatar AI chuyển động, sắc nét và không viền xanh trên mobile/desktop.
- [x] Không có xử lý chroma-key CPU từng pixel trong luồng chính.
- [x] Hero không bị chặn bởi API config.
- [x] Ảnh card dùng responsive URL/srcset khi nguồn hỗ trợ.
- [x] Nhạc không tải audio element trước khi người dùng đồng ý hoặc phiên trước đang phát.
- [x] Trình duyệt không hỗ trợ Worker hoặc alpha video có fallback đầy đủ trong source.
- [x] Build production thành công.
- [ ] Không có lỗi console nghiêm trọng.
- [ ] Không có regression chức năng admin, blog, album, CV, âm thanh và chatbot.

### Trạng thái thực hiện

- Kiểm tra tự động và các bản sửa tương thích hoàn thành ngày 2026-08-04; báo cáo tại `docs/performance/PHASE_9_COMPATIBILITY.md`.
- Browser runtime không có Chrome, Edge, Firefox hoặc in-app browser khả dụng (`browsers.list() = []`), vì vậy không đánh dấu đạt các mục cần quan sát hình ảnh, console, FPS hoặc thao tác thật.
- Frontend production build và full ESLint đạt; backend Release build đạt với hai cảnh báo nullable có sẵn trong model.
- Route SPA, dynamic chunks, MIME, video range request, responsive chat geometry, mạng giới hạn tốc độ và CORS local/LAN đã được xác minh tự động.
- Phase 9 chưa đủ điều kiện nghiệm thu phát hành cho tới khi hoàn thành ma trận trình duyệt/thiết bị thật và xác nhận deployment mới.

## 13. Thứ tự triển khai

1. Đo baseline và khóa mẫu hiệu ứng.
2. Tối ưu dữ liệu/API và loại bỏ màn hình chờ.
3. Xây pipeline ảnh responsive.
4. Tối ưu tải âm thanh và video album.
5. Nâng cấp video icon AI.
6. Tách Three.js và triển khai Worker/fallback.
7. Tối ưu DOM, scroll, AOS và compositor.
8. Cấu hình bundle và cache Vercel.
9. Kiểm thử đa thiết bị và đối chiếu hiệu ứng.
10. Chỉ phát hành khi toàn bộ tiêu chí nghiệm thu đạt yêu cầu.

## 14. Rủi ro và phương án fallback

| Rủi ro | Phương án xử lý |
|---|---|
| Safari không hỗ trợ đầy đủ OffscreenCanvas | Dùng cùng Three.js engine trên main thread |
| Trình duyệt không đọc VP9 alpha | Thử HEVC alpha, sau đó fallback GPU chroma-key |
| `content-visibility` ảnh hưởng thời điểm AOS | Tăng khoảng render sớm hoặc tắt riêng cho section gặp lỗi |
| Worker và fallback cho hình ảnh khác nhau | Dùng chung config, shader và logic update |
| Video Retina quá nặng | Dùng nhiều nguồn theo viewport/DPR, không giảm kích thước hiển thị |
| Cache media làm chậm cập nhật | Version hoặc hash tên file media |
| Backend maintenance cập nhật chậm | Chuyển maintenance flag sang Vercel Edge hoặc server push |

Kế hoạch này ưu tiên tối ưu kiến trúc và pipeline xử lý thay vì giảm chất lượng. Nếu một thay đổi làm mất hoặc thay đổi rõ rệt hiệu ứng, thay đổi đó không đạt điều kiện nghiệm thu và không được đưa vào bản phát hành.
