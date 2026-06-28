# Hướng dẫn Deploy 86Job lên Coolify (One-Click)

Tài liệu này hướng dẫn bạn cách tối ưu hóa và triển khai ứng dụng **86Job** lên nền tảng **Coolify** chỉ với vài thao tác cơ bản nhờ Dockerfile đa tầng (multi-stage) tối ưu cao.

---

## 🚀 Các Bước Triển Khai Nhanh (One-Click)

1. **Đăng nhập vào Coolify**: Truy cập bảng điều khiển Coolify của bạn.
2. **Tạo Dự án Mới (Create New Project)**: Chọn dự án của bạn hoặc tạo mới.
3. **Thêm Nguồn (Add Source)**: 
   - Chọn **Github Repository** (hoặc bất kỳ Git provider nào bạn dùng).
   - Chọn kho lưu trữ chứa mã nguồn **86Job** này.
4. **Cấu hình Trình dựng (Build Pack)**:
   - Coolify sẽ tự động nhận diện **Dockerfile** ở thư mục gốc của dự án.
   - Nếu được hỏi, chọn **Dockerfile** làm Build Pack thay vì Nixpacks.
5. **Cấu hình Cổng (Destination Port)**:
   - Đặt cổng đích (Exposed Port / Destination Port) là **3000**.
6. **Nhấn Deploy**: Chờ Coolify tải mã nguồn, build dự án thành image siêu gọn nhẹ, và khởi chạy dự án!

---

## 💾 Thiết Lập Lưu Trữ Vĩnh Viễn (Database Persistence)

Ứng dụng hỗ trợ cơ chế tự động chuyển đổi thông minh (hybrid):
- Nếu cấu hình Firebase, dữ liệu được đồng bộ trực tuyến lên **Cloud Firestore**.
- Nếu không có Firebase, ứng dụng sử dụng cơ sở dữ liệu tệp cục bộ (`db.json`) cực kỳ ổn định.

Để đảm bảo dữ liệu trong `db.json` **không bị mất** mỗi khi cập nhật hoặc restart container trên Coolify:

1. Đi tới phần cấu hình ứng dụng trên Coolify, tìm tab **Storage / Volumes**.
2. Tạo một mount volume mới với thông số sau:
   - **Source**: Chọn thư mục trên VPS của bạn (ví dụ: `86job-data`).
   - **Destination**: `/app/data` (đây là thư mục lưu trữ mà Dockerfile đã tối ưu hóa sẵn).
3. Trong phần **Environment Variables**, thêm biến môi trường sau:
   ```env
   DATA_PATH=/app/data
   ```
4. Khi đó, tệp cơ sở dữ liệu sẽ được lưu vĩnh viễn tại thư mục được ánh xạ, dữ liệu của bạn sẽ an toàn vĩnh viễn!

---

## 🔑 Các Biến Môi Trường (Environment Variables)

Bạn có thể cấu hình các biến sau trong phần **Environment Variables** của ứng dụng trên Coolify:

### 1. Trí tuệ nhân tạo (AI Assistant)
- `GEMINI_API_KEY`: Khóa API Gemini của bạn để phân tích tự động bài đăng tuyển dụng bằng AI (Nếu không có, hệ thống sẽ tự động chuyển sang parser Regex dự phòng thông minh).

### 2. Bản đồ trực quan
- `VITE_KAKAO_MAP_KEY`: App Key Javascript của Kakao Map để hiển thị bản đồ việc làm trực quan.

### 3. Kết nối Cloud Firestore (Tùy chọn)
Nếu bạn muốn dùng cơ sở dữ liệu đám mây Firestore thay cho tệp `db.json` cục bộ, hãy khai báo các biến này:
- `FIREBASE_PROJECT_ID`: ID dự án Firebase của bạn.
- `FIREBASE_DATABASE_ID`: ID cơ sở dữ liệu Firestore tùy chỉnh (để trống nếu sử dụng database `(default)`).
- `FIREBASE_SERVICE_ACCOUNT`: Toàn bộ nội dung chuỗi JSON của tệp Service Account Private Key của Firebase (rất dễ dán vào biến môi trường của Coolify dạng một dòng).

---

## ⚡ Các Tính Năng Đã Tối Ưu Hóa Sẵn Trong Code

- **Không bao giờ crash**: Nếu Firebase chưa được thiết lập hoặc bị mất kết nối, hệ thống sẽ tự động ghi nhận và chuyển hướng hoạt động sang local database `db.json` một cách mượt mà mà không gây gián đoạn hay sập server.
- **Dockerfile Đa Tầng Siêu Nhẹ**: Tách biệt quá trình compile React (cần nhiều devDependencies nặng) và quá trình chạy (runner chỉ cài production dependencies) giúp image Docker chỉ nặng khoảng vài chục MB, giảm thiểu tối đa tài nguyên VPS của bạn.
- **Single-File Bundling**: Express Server được đóng gói thành một file duy nhất `dist/server.cjs` thông qua esbuild giúp tăng tốc khởi động ứng dụng và bỏ qua các lỗi phân giải ESM rắc rối trên nền tảng Linux.
