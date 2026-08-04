# Giai đoạn 10 - Tia sáng hấp dẫn chân thực và Alpha Avatar AI trên Mobile

## 1. Mục tiêu

- Làm các tia sáng đi vào hố đen có cảm giác bị bẻ cong bởi trường hấp dẫn thay vì giống dải lụa neon.
- Xóa hoàn toàn nền chữ nhật xanh/xám của avatar AI trên Safari iPhone, iPad và các trình duyệt mobile fallback.
- Giữ nguyên số lượng hiệu ứng, chuyển động, autoplay, loop, hover, glow, bloom và chất lượng hiển thị hiện có.
- Đồng bộ một hệ hình ảnh trên mobile, tablet và desktop; chỉ thay đổi cách dựng theo kích thước màn hình và DPR.

## 2. Hợp đồng không cắt giảm hiệu ứng

Các thông số sau được khóa làm baseline và không được giảm để đổi lấy hiệu năng:

| Thành phần | Mobile | Tablet | Desktop |
|---|---:|---:|---:|
| Tia sáng | 7 | 9 | 11 |
| Segment mỗi tia | 64 | 96 | 96 |
| Galaxy particle | 50.000 | 100.000 | 180.000 |
| Far stars | 1.000 | 2.000 | 3.000 |
| Mid dust | 600 | 1.200 | 2.000 |
| Near dust | 150 | 300 | 500 |
| Orbital particle | 60 | 120 | 200 |
| Bloom strength | 0,58 | 0,72 | 0,82 |

Ngoài ra phải giữ nguyên:

- Event horizon, accretion disk, photon ring, Einstein ring và lens arc.
- Global bloom radius, threshold và boost theo scroll.
- Camera zoom, parallax, meteor, AOS, glass blur và toàn bộ animation giao diện.
- Avatar AI chuyển động, autoplay, loop, badge `Hỏi AI`, hover scale và drop shadow.

## 3. Chẩn đoán hiện trạng

### 3.1. Tia sáng

- Quỹ đạo hiện tại được tạo bằng các control point ngẫu nhiên và `CatmullRomCurve3`, nên một số tia giao nhau hoặc cong không theo cùng một trường hấp dẫn.
- Đầu ngoài của ribbon rộng `1.9`, khiến tia giống dải vải phát sáng.
- Additive blending, lõi trắng và bloom cộng dồn làm nhiều vùng bị cháy trắng.
- Tia chưa có quy tắc che khuất rõ ràng khi đi phía sau event horizon.
- Màu tím, cyan, vàng và trắng thay đổi mạnh nhưng chưa mô phỏng dịch chuyển phổ do hấp dẫn.

### 3.2. Avatar AI mobile

- Poster RGBA hiện tại có matte sạch, nhưng Safari/iOS không dùng VP9 alpha và phải chuyển sang MP4 + WebGL chroma-key lúc chạy.
- Ảnh kiểm tra thiết bị thật cho thấy đường chroma-key runtime này có thể trả ra nguyên nền xanh của MP4 thay vì alpha mong muốn.
- `background: transparent` trong CSS không thể sửa pixel video đã được canvas xuất ra ở trạng thái opaque; cần một đường alpha không phụ thuộc màu trên Safari.

## 4. Luồng A - Nâng cấp tia sáng hấp dẫn

### Bước A1 - Khóa baseline và phân bố xác định

- Ghi lại hash cấu hình ray, bloom, particle và ảnh tham chiếu trước khi sửa.
- Thay `Math.random()` trực tiếp bằng bộ sinh seed xác định cho riêng tia sáng.
- Phân bố góc xuất phát theo sector để giữ đủ `7/9/11` tia nhưng hạn chế tụ cụm và giao cắt lớn.

Điều kiện đạt:

- Mỗi lần tải trang có cùng bố cục tia.
- Không thay đổi số tia hoặc số segment trên bất kỳ thiết bị nào.

### Bước A2 - Quỹ đạo gravitational capture

- Thay control point ngẫu nhiên bằng hàm quỹ đạo giải tích lấy event horizon và photon ring làm mốc.
- Chia quỹ đạo thành ba vùng liên tục:
  1. gần thẳng ở xa;
  2. cong nhanh khi tiến gần photon sphere;
  3. lượn một phần quanh photon sphere rồi chìm sau event horizon.
- Giới hạn độ cong và độ cao theo seed để tạo chiều sâu nhưng không để tia bay xuyên tùy ý qua tâm hố đen.

Điều kiện đạt:

- Tia cong mạnh chủ yếu ở vùng gần hố đen.
- Điểm cuối bị hấp thụ trong hoặc sau event horizon.
- Không xuất hiện góc gãy hay thay đổi vận tốc hình học đột ngột.

### Bước A3 - Cấu trúc ba lớp trong cùng shader

- Giữ một draw call hợp nhất, nhưng tạo ba miền thị giác trong fragment shader:
  - lõi photon trắng rất mảnh;
  - halo màu hẹp;
  - envelope bloom rộng, mờ và mềm.
- Thu hẹp hình học đầu ngoài; bù độ hiện diện bằng halo shader thay vì ribbon vật lý quá rộng.
- Giữ global `UnrealBloomPass`; chỉ chuẩn hóa năng lượng đầu ra của material tia để không cháy trắng.

Điều kiện đạt:

- Tia vẫn sáng và nổi bật nhưng có lõi sắc nét.
- Bloom của đĩa bồi tụ và các hiệu ứng khác không thay đổi.
- Không tăng số mesh hoặc draw call theo số lớp.

### Bước A4 - Photon packet và gia tốc cảm nhận

- Thay các dải sin đều bằng photon packet có đầu mềm và đuôi ngắn.
- Ánh xạ thời gian phi tuyến để packet di chuyển chậm ở xa và nhanh dần khi gần event horizon.
- Dùng noise nhỏ để ánh sáng sống động nhưng không nhấp nháy hoặc biến thành nét đứt neon.

Điều kiện đạt:

- Chuyển động luôn hướng từ ngoài vào hố đen.
- Không có bước nhảy nhìn thấy khi packet loop.
- Mobile và desktop có cùng nhịp cảm nhận.

### Bước A5 - Màu phổ và che khuất chiều sâu

- Dùng phổ màu có kiểm soát: trắng/xanh rất nhẹ ở vùng tiếp cận, vàng cam ở vùng nóng và đỏ tối trước khi bị hấp thụ.
- Tính front/back factor theo vị trí quỹ đạo và hướng camera.
- Fade hoặc che phần tia đi phía sau event horizon; không cho additive blending vẽ xuyên qua đĩa đen.
- Giữ `depthTest`, không bật `depthWrite` cho vật liệu trong suốt.

Điều kiện đạt:

- Tia phía sau bị hố đen che đúng chiều sâu.
- Không còn mảng tím/trắng ngẫu nhiên hoặc vùng trắng clipping lớn.
- Event horizon vẫn đen và có đường biên rõ.

## 5. Luồng B - Xóa nền avatar AI trên mobile

### Bước B1 - Kiểm tra toàn bộ frame nguồn

- Trích frame tại nhiều thời điểm trong vòng lặp video, không chỉ frame poster đầu tiên.
- Đo màu nền, alpha coverage và vùng opaque ngoài silhouette ở từng frame.
- Xác định nền có đủ đồng nhất để chroma-key cải tiến hay cần semantic video matting.

Điều kiện đạt:

- Có matte đúng cho tóc, tay, quần áo và khoảng trống giữa cơ thể.
- Không đánh giá thành công chỉ dựa trên bốn góc ảnh trong suốt.

### Bước B2 - Tạo lại master alpha chất lượng cao

- Tạo matte theo silhouette nhân vật cho toàn bộ video, có soft edge và temporal consistency giữa các frame.
- Despill xanh ở viền tóc, tay và áo nhưng không làm đổi màu nhân vật.
- Giữ nguyên khuôn mặt, hình dáng, động tác, tốc độ, thời lượng và vòng lặp video.
- Xuất poster RGBA mới từ chính master alpha; poster phải thực sự trong suốt ở toàn bộ vùng ngoài nhân vật.

Điều kiện đạt:

- Alpha ngoài silhouette bằng 0, không còn mảng nền lớn opaque.
- Không có viền xanh, viền đen hoặc halo răng cưa quanh nhân vật.
- Frame đầu và frame cuối không tạo nháy khi loop.

### Bước B3 - Pipeline tương thích Safari/iOS

- Tiếp tục dùng VP9 alpha cho trình duyệt hỗ trợ.
- Với Safari/iOS, dùng fallback có đường alpha đáng tin cậy thay vì phụ thuộc vào chroma-key ngưỡng màu hiện tại.
- Dùng animated WebP alpha native trên Safari/iOS; nếu asset không tải được, dùng poster RGBA trong suốt làm fallback cuối.
- Poster alpha chỉ hiển thị khi decoder/canvas chưa sẵn sàng và phải được fade-out sau frame đầu tiên thành công.

Điều kiện đạt:

- Safari iPhone không xuất hiện nền chữ nhật ở poster, lúc tải video hoặc trong khi loop.
- Chrome/Edge/Firefox vẫn dùng đường VP9 alpha hiện tại hoặc bản nâng cấp tương đương.
- Không đưa xử lý pixel từng frame trở lại main thread.

### Bước B4 - Độ nét và responsive

- Giữ kích thước hiển thị hiện tại: `112 x 127` tối thiểu trên mobile và `150 x 170` trên desktop.
- Render canvas theo CSS size nhân DPR, giới hạn DPR 3 như baseline.
- Dùng nội suy texture chất lượng cao, giữ đúng aspect ratio nhân vật và tránh kéo méo bằng `object-fill` nếu master mới không cùng tỷ lệ khung.
- Kiểm tra vùng chạm của nút, vị trí badge và safe-area bottom/right trên iPhone.

Điều kiện đạt:

- Nhân vật sắc nét tại DPR 1, 2 và 3.
- Không che nội dung quan trọng, thanh điều hướng Safari hoặc home indicator.
- Không cắt tay, tóc, chân hoặc badge `Hỏi AI` khi xoay màn hình.

## 6. Thứ tự triển khai

1. Khóa baseline và tạo ảnh/frame tham chiếu.
2. Sửa quỹ đạo tia sáng và phân bố seed.
3. Sửa shader lõi/halo/bloom, photon packet, màu phổ và occlusion.
4. Build và kiểm tra lỗi shader trên Worker lẫn main-thread fallback.
5. Phân tích toàn bộ video AI và tạo master matte mới.
6. Tạo lại alpha video, fallback mobile và poster RGBA.
7. Cập nhật component chọn codec/fallback và responsive nếu cần.
8. Kiểm thử desktop, Android và đặc biệt Safari iPhone/iPad.
9. Chỉ commit/push khi toàn bộ tiêu chí nghiệm thu đạt.

## 7. Kiểm thử bắt buộc

### Tự động

- Frontend ESLint đầy đủ.
- Frontend production build.
- Kiểm tra shader compile ở cả Worker và fallback.
- Kiểm tra metadata codec, kích thước, FPS, duration và alpha của asset video.
- Quét nhiều frame để xác nhận không có vùng nền opaque ngoài silhouette.
- Kiểm tra poster có alpha channel, góc trong suốt và tỷ lệ foreground hợp lý.

### Thiết bị thực tế

- Safari iPhone dọc và ngang.
- Safari iPad.
- Chrome Android và Samsung Internet.
- Chrome, Edge và Firefox desktop.
- DPR 1, 2 và 3; viewport nhỏ, trung bình và lớn.
- Mở lần đầu chưa cache, mở lại có cache, đổi tab, khóa/mở màn hình và loop video nhiều lần.

## 8. Tiêu chí nghiệm thu cuối

- Tia sáng nhìn như quỹ đạo ánh sáng bị bẻ cong và bắt giữ bởi hố đen, không giống dải lụa neon.
- Giữ đủ số tia, segment, particle, bloom và toàn bộ hiệu ứng baseline.
- Không có tia vẽ xuyên sai qua event horizon.
- Không có vùng bloom cháy trắng lớn làm mất chi tiết.
- Avatar AI không còn nền chữ nhật trên Safari/iOS hoặc bất kỳ breakpoint mobile nào.
- Avatar AI vẫn chuyển động, autoplay, loop, sắc nét và không có viền xanh.
- Không tăng công việc per-pixel trên main thread.
- Build, lint và kiểm thử đa thiết bị đạt trước khi phát hành.

## 9. Rủi ro và phương án dự phòng

| Rủi ro | Phương án xử lý |
|---|---|
| Tia chân thực hơn nhưng khó nhìn trên nền sáng | Tăng halo cục bộ trong shader, không tăng width hình học hoặc global bloom |
| Occlusion làm tia biến mất quá sớm | Điều chỉnh vùng fade theo photon ring và camera depth, không bỏ occlusion |
| Matte video rung giữa các frame | Dùng temporal smoothing/semantic matting và kiểm tra frame difference |
| Safari không tải được animated WebP | Hiển thị poster RGBA trong suốt; không quay lại canvas có nguy cơ nền opaque |
| Asset alpha mới tăng dung lượng | Tối ưu codec/CRF và cache; không giảm độ phân giải hoặc FPS hiển thị |
| Poster hiện nền trong thời gian khởi tạo | Chỉ dùng poster RGBA đã kiểm tra toàn frame và fade sau frame GPU đầu tiên |

## 10. Trạng thái thực hiện ngày 2026-08-04

### Đã hoàn thành kỹ thuật

- Quỹ đạo tia dùng seed xác định, phân bố theo sector và cùng chiều xoáy quanh photon ring.
- Tia vẫn giữ `7/9/11` ray và `64/96` segment; toàn bộ particle cùng global bloom giữ nguyên baseline.
- Shader mới có photon core, narrow halo, bloom envelope, photon packet gia tốc, phổ màu có kiểm soát và fade hấp thụ tại event horizon.
- Event horizon opaque tiếp tục ghi depth; ray giữ `depthTest: true` và `depthWrite: false` để phần phía sau bị che đúng pipeline trong suốt.
- Chrome/Edge/Firefox dùng `avatar_AI_alpha_v2.webm` 720 x 1280, VP9 alpha, 24 FPS, 240 frame.
- Bản packed-alpha v2 đã bị loại sau khi ảnh chụp iPhone thật cho thấy Safari vẫn composite nền thành opaque.
- Safari/iOS hiện dùng `avatar_AI_mobile_v3.webp` 450 x 510, alpha animation native, 24 FPS, 240 frame và loop vô hạn.
- Poster dùng `avatar_AI_poster_v2.png` 720 x 1280 RGBA; alpha có dải 0-255 và 55,87% pixel hoàn toàn trong suốt.
- Asset v3 dùng tên mới để tránh Safari/iPhone tiếp tục lấy media v2 từ cache.
- Ba asset runtime cũ đã được xóa; `avatar_AI.webm` vẫn được giữ làm video nguồn để tái tạo pipeline.

### Kết quả kiểm tra tự động

- Reconstruction alpha tại 6 mốc từ frame 0 đến frame 239 không xuất hiện nền xanh; vùng hoàn toàn trong suốt dao động 54,54%-55,76%.
- Animated WebP có 240 frame, 24 FPS, loop vô hạn, kích thước 450 x 510 và dung lượng 5.560.020 byte.
- Kiểm tra alpha ở 6 mốc từ frame 0 đến 239 cho thấy nền có alpha 0-1/255; compositing trên checker không xuất hiện hình chữ nhật.
- Kích thước 450 x 510 khớp mức pixel cần cho avatar lớn nhất tại DPR 3, không dùng canvas hoặc texture upload JavaScript trên iOS.
- Frontend ESLint đạt.
- Frontend production build đạt.
- `git diff --check` không phát hiện whitespace error.

### Chưa thể xác nhận trong môi trường hiện tại

- Browser runtime trả về danh sách rỗng, vì vậy chưa thể chụp và đánh giá trực quan tia WebGL trên desktop/mobile tại máy chạy Codex.
- Cần kiểm tra sau deploy trên Safari iPhone thật để xác nhận animated WebP alpha native hoạt động đúng trong môi trường production.
- Chỉ đánh dấu nghiệm thu hình ảnh cuối cùng sau khi đối chiếu tia sáng và avatar trên thiết bị thật; các mục này chưa được tự động coi là đạt.
