# Phase 2 - Data Pipeline Optimization

## Mục tiêu

Tối ưu luồng dữ liệu khởi động và API mà không thay đổi Three.js, AOS, CSS, video AI hoặc cấu trúc hiển thị.

## Thay đổi đã triển khai

### Config khởi động

- Ứng dụng render ngay dữ liệu `localStorage` hoặc `defaultData`.
- Đã loại bỏ màn hình spinner chặn toàn bộ ứng dụng trong lúc chờ `/api/config`.
- Config được refresh trong nền sau khi React mount.
- JSON cache lỗi không còn làm ứng dụng crash; hệ thống tự quay về `defaultData`.

### Request lifecycle

- Request config đang chạy được dedupe, các component dùng chung một Promise.
- Request GET được hủy khi provider/component unmount.
- Refresh được giới hạn tối thiểu 15 giây.
- Polling nền đổi từ 10 giây sang 60 giây và chỉ chạy khi tab hiển thị.
- Khi tab online trở lại, config được refresh ngay.
- Các tab cùng origin đồng bộ config qua sự kiện `storage`.

### HTTP revalidation

- Backend tạo ETag SHA-256 cho config và danh sách bài viết.
- Frontend lưu ETag và gửi `If-None-Match` ở lần kiểm tra sau.
- Backend trả `304 Not Modified` khi dữ liệu không thay đổi.
- CORS expose header `ETag` và cache preflight trong 24 giờ.
- Timestamp `?t=...` phá cache đã được loại bỏ.

### Blog và bình luận

- `GET /api/posts` trả thêm `commentCount`.
- Đã loại bỏ một request `/api/comments/bypost/:id` cho mỗi card bài viết.
- Sau khi người dùng thêm bình luận từ card, count được cập nhật optimistic trong state và cache.
- Nếu request posts lỗi nhưng có cache, giao diện giữ dữ liệu cũ thay vì thay bằng card báo lỗi.
- Query đọc dùng `AsNoTracking()` và nhận `CancellationToken`.

### Database

- Thêm composite index `Comments(MaBaiViet, NgayBinhLuan)`.
- Index hỗ trợ cả truy vấn đếm bình luận theo bài và tải bình luận theo thời gian.
- Migration: `20260804104033_AddCommentPostDateIndex`.

## Thay đổi request dự kiến

Với `N` bài viết:

| Luồng | Trước | Sau |
|---|---:|---:|
| Tải danh sách bài và comment count | `1 + N` request | `1` request |
| Config polling | 1 response JSON mỗi 10 giây | Tối đa 1 revalidation mỗi 60 giây |
| Config không đổi | Khoảng 12 KB JSON | `304` không có response body |

## Tương thích

- Backend mới tương thích với frontend cũ vì chỉ bổ sung `commentCount`.
- Frontend mới vẫn tải được config từ backend cũ nếu chưa có ETag.
- Frontend mới cần backend mới để hiển thị comment count chính xác mà không dùng N+1 request.
- Thứ tự deploy bắt buộc: **backend trước, frontend sau**.

## Xác minh

- `dotnet build --no-restore`: thành công.
- Migration SQL idempotent: sinh thành công.
- Frontend build bằng Node 22 + Vite 5: thành công.
- ESLint cho `PortfolioContext.jsx`, `App.jsx`, `ConfigEditor.jsx`: thành công.
- `BlogSection.jsx`: phần thay đổi mới sạch lint sau khi bỏ effect đồng bộ likes; full-project lint vẫn còn lỗi cũ ở các file ngoài phạm vi Phase 2.

## Không thay đổi

- Không sửa `frontend/index.html` hoặc cấu hình Three.js.
- Không sửa particle, bloom, camera, shader hoặc animation loop.
- Không sửa AOS, glass blur, layout hoặc responsive CSS.
- Không sửa video AI hoặc âm thanh trong phase này.

## Việc hoãn lại

Maintenance mode hiện đồng bộ ngay giữa các tab cùng origin và tối đa khoảng 60 giây giữa các thiết bị khác nhau. Nếu cần đồng bộ gần như tức thời trên mọi thiết bị, chuyển maintenance flag sang Vercel Edge Config hoặc server push trong một thay đổi riêng.
