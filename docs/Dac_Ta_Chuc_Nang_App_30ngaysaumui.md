# TÀI LIỆU ĐẶC TẢ CHỨC NĂNG

## Ứng dụng Di động Tập thể dục & Sức khỏe (FitLife)

**Nền tảng:** React Native (Expo)  
**Backend:** Supabase (PostgreSQL, Auth, Storage)  
**Phiên bản tài liệu:** Cập nhật theo codebase hiện tại

---

## 1. Tổng quan ứng dụng

Ứng dụng **FitLife** là giải pháp trên điện thoại thông minh giúp người dùng theo dõi chế độ tập luyện cá nhân hóa, quản lý dinh dưỡng, lượng nước uống hàng ngày và duy trì thói quen lành mạnh thông qua hệ thống nhắc nhở thông minh.

Dữ liệu người dùng (hồ sơ, buổi tập, dinh dưỡng, nước uống, huy hiệu) được lưu trữ và đồng bộ trên **Supabase**. Chương trình tập, bài tập và thư viện món ăn được quản trị tập trung trên server; ứng dụng tải media minh họa (ảnh động GIF hoặc video MP4) theo thời gian thực khi người dùng mở buổi tập.

---

## 2. Các chức năng chính của ứng dụng

### 2.1. Luồng Đăng nhập, Đăng ký & Khởi tạo Hồ sơ (Onboarding Flow)

Luồng này thu thập chỉ số cơ thể ban đầu để cá nhân hóa lộ trình tập luyện và dinh dưỡng.

| Giai đoạn / Màn hình | Chi tiết các trường thông tin & Tính năng |
|---|---|
| **Màn hình Đăng nhập / Đăng ký** | Đăng nhập hoặc đăng ký bằng **Email + Mật khẩu**. Hỗ trợ **Quên mật khẩu** (gửi email đặt lại qua Supabase Auth). Nút đăng nhập nhanh **Google** và **Apple** hiển thị trên giao diện nhưng hiện ở trạng thái *đang phát triển*. |
| **Đăng ký Tài khoản** | Nhập Email, Tạo Mật khẩu (tối thiểu **8 ký tự**, bao gồm **chữ hoa, số và ký tự đặc biệt**) và Xác nhận mật khẩu. |
| **Onboarding — Bước 1: Thông tin cá nhân** | Họ và tên, Ngày sinh (để tính tuổi), Giới tính (Nam / Nữ / Khác). |
| **Onboarding — Bước 2: Chỉ số cơ thể** | Chiều cao (cm) và Cân nặng (kg). Hệ thống tự động tính **BMI**, **BMR** (Mifflin-St Jeor) và **TDEE**. |
| **Onboarding — Bước 3: Mục tiêu & Vận động** | Mục tiêu: Giảm cân, Tăng cơ, Duy trì, Cải thiện cardio, Linh hoạt. Mức vận động hàng tuần: Ít vận động → Rất nhiều (5 mức). Sau khi hoàn thành, cờ `onboarding_completed` được lưu vào hồ sơ. |

### 2.2. Chuỗi Ngày Tập liên tục (Streaks)

Hệ thống theo dõi chuỗi ngày tập liên tiếp dựa trên việc hoàn thành buổi tập hàng ngày.

- **Cơ chế hoạt động:** Khi người dùng hoàn thành buổi tập (`complete_workout_session`), hệ thống cập nhật bảng `user_streaks`. Nếu tập vào ngày liên tiếp so với lần trước, **Streak +1**. Nếu bỏ lỡ một ngày (không tập liên tiếp), chuỗi **reset về 1** khi tập lại.
- **Hiển thị:** Streak hiện tại, kỷ lục streak dài nhất trên tab **Home** (Dashboard).
- **Huy hiệu liên quan:** Kiên trì 3 ngày, Tuần vàng (7 ngày), Thép không gỉ (30 ngày) — xem mục 2.7.

> **Lưu ý:** Ứng dụng **không** khóa bài tập theo lịch từng ngày (daily unlock). Người dùng tự chọn chương trình tập bất kỳ lúc nào từ tab Training.

### 2.3. Chương trình Tập luyện & Bài tập từ Server

Dữ liệu chương trình tập và bài tập được lưu trên Supabase (`programs`, `exercises`).

- **Danh sách chương trình:** Tab **Training** hiển thị các khóa tập từ server (tiêu đề, mô tả, cấp độ Beginner/Intermediate/Advanced, ảnh thumbnail). Khi mất kết nối, ứng dụng dùng **5 chương trình mẫu offline** dự phòng.
- **Lịch ngang:** Calendar 7 ngày (3 ngày trước, hôm nay, 3 ngày sau) để người dùng chọn ngày tham chiếu.
- **Buổi tập chi tiết:** Mỗi chương trình gồm danh sách bài tập với tên, thời lượng, **giá trị MET**, và **media_url** (GIF hoặc video MP4). Ứng dụng phát video lặp hoặc hiển thị ảnh động minh họa tư thế.
- **Luồng tập:** Đếm ngược thời gian từng bài → nghỉ giữa hiệp → chuyển bài tiếp theo → hoàn thành buổi tập.
- **Tính Calo:** `Calo = MET × cân_nặng(kg) × thời_gian(giờ)`. Cân nặng lấy từ hồ sơ người dùng.

### 2.4. Nhắc nhở & Thông báo (Notifications)

Giúp người dùng xây dựng tính kỷ luật, không bỏ lỡ lịch tập và sinh hoạt khoa học. Triển khai qua **expo-notifications** (local push notification).

| Loại nhắc | Mô tả |
|---|---|
| **Nhắc tập luyện** | Người dùng bật/tắt và chọn **giờ nhắc** (mặc định 06:30). Thông báo đẩy hàng ngày tại giờ đã chọn. |
| **Nhắc uống nước** | Tự động nhắc mỗi **2 giờ** trong khung **07:00 – 22:00** (các mốc: 7h, 9h, 11h, 13h, 15h, 17h, 19h, 21h). Bật/tắt từ tab Dinh dưỡng hoặc modal Cài đặt thông báo. |
| **Thông báo huy hiệu** | Khi mở khóa huy hiệu mới, gửi thông báo (có thể tắt trong cài đặt). |

Cài đặt thông báo mở từ **nút chuông trên Dashboard** hoặc **menu 3 gạch → Thông báo**.

### 2.5. Định lượng Thức ăn & Dinh dưỡng hàng ngày (Nutrition Tracker)

Dựa trên TDEE và mục tiêu tập luyện, hệ thống tính lượng calo cần nạp trong ngày.

- **Mục tiêu calo:** TDEE điều chỉnh theo mục tiêu (ví dụ: Giảm cân −400 kcal, Tăng cơ +300 kcal). Tối thiểu 1200 kcal/ngày.
- **Phân bổ Macronutrients:** Protein **30%**, Carbs **45%**, Fat **25%** của tổng calo mục tiêu.
- **Nhật ký ăn uống:** Thêm món từ thư viện server vào các bữa **Sáng, Trưa, Tối, Snack**. Hệ thống tự cộng dồn calo và macro đã nạp, hiển thị calo còn lại.
- **Gợi ý món ăn:** Đề xuất món phù hợp theo từng bữa.
- **Biểu đồ:** Vòng calo và biểu đồ tròn Protein / Carbs / Fat.
- **Cảnh báo vượt ngưỡng:** Thông báo khi vượt mục tiêu calo hoặc macro.

### 2.6. Theo dõi Lượng nước uống hàng ngày (Water Tracker)

- **Công thức khuyến nghị:** `Cân nặng (kg) × 35 ml = Lượng nước cần uống (ml/ngày)`. Mặc định **2000 ml** khi chưa có cân nặng.
- **Giao diện tương tác:** Thanh tiến độ trực quan. Mỗi lần uống nước, chạm **+250 ml** hoặc **+500 ml** để cập nhật. Có tùy chọn đặt lại về mục tiêu khi vượt ngưỡng.
- **Vị trí hiển thị:** Tab **Dinh dưỡng**, tab **Cá nhân**, và widget **Sức khỏe hôm nay** trên Dashboard.

### 2.7. Hệ thống Huy hiệu (Badges)

Ứng dụng có **8 huy hiệu** mặc định, tự động kiểm tra và cấp khi đạt điều kiện:

| Mã | Tên | Điều kiện |
|---|---|---|
| `onboarding_complete` | Khởi đầu | Hoàn thành onboarding |
| `first_workout` | Buổi tập đầu | Hoàn thành buổi tập đầu tiên |
| `streak_3` | Kiên trì 3 ngày | Streak tập 3 ngày liên tiếp |
| `streak_7` | Tuần vàng | Streak tập 7 ngày liên tiếp |
| `streak_30` | Thép không gỉ | Streak tập 30 ngày liên tiếp |
| `water_goal` | Hydration Pro | Đạt mục tiêu nước trong một ngày |
| `nutrition_goal` | Dinh dưỡng chuẩn | Đạt mục tiêu calo trong một ngày |
| `burn_500` | Đốt cháy | Đốt cháy 500+ kcal trong một ngày |

Huy hiệu hiển thị trên tab **Home**; huy hiệu mới có thể kèm thông báo push.

### 2.8. Quản trị & Tiện ích bổ sung

| Tính năng | Mô tả |
|---|---|
| **Menu ứng dụng** | Drawer điều hướng nhanh giữa các tab, mở cài đặt thông báo, đăng xuất. |
| **CMS Admin** | Tài khoản có `role = admin` truy cập màn hình quản trị nội dung (chương trình, bài tập, món ăn). |
| **Chỉnh sửa hồ sơ** | Cập nhật tên, ngày sinh, mục tiêu, chiều cao, cân nặng, ảnh đại diện; hệ thống tự tính lại chỉ số sức khỏe. |
| **Xuất dữ liệu** | Xuất toàn bộ dữ liệu cá nhân ra file **Excel (.xlsx)**. |
| **Xóa tài khoản** | Xóa vĩnh viễn tài khoản và dữ liệu liên quan qua Edge Function. |

---

## 3. Kiến trúc Giao diện Ứng dụng (UI Architecture)

Ứng dụng dùng **Bottom Navigation Bar** với **4 tab** chính:

### 3.1. Tab Home (Dashboard)

Hiển thị tổng quan trong ngày:

- Lời chào cá nhân hóa và ngày hiện tại
- **Chỉ số nhanh:** Streak ngày, Calo đốt, Buổi tập, Kỷ lục streak
- **Biểu đồ hoạt động 7 ngày** (số buổi tập theo ngày)
- **Buổi tập** — phím tắt vào tab Training
- **Sức khỏe hôm nay** — calo nạp, nước uống, macro; phím tắt vào tab Dinh dưỡng
- **Huy hiệu** — lưới huy hiệu đã mở khóa / tổng số
- Nút **chuông** mở cài đặt thông báo

### 3.2. Tab Training (Lịch tập & Chương trình)

- Lịch ngang 7 ngày
- Danh sách chương trình tập từ server (hoặc dữ liệu offline dự phòng)
- Chạm chương trình → màn hình **Buổi tập chi tiết** (video/GIF, timer, tính calo, hoàn thành buổi tập)

> Không có tab riêng “Phòng tập” / thư viện bài tập đơn lẻ theo nhóm cơ. Toàn bộ bài tập nằm trong từng chương trình.

### 3.3. Tab Nutrition (Dinh dưỡng)

- Vòng calo và biểu đồ macro
- Theo dõi nước uống (+250 ml / +500 ml) và bật/tắt nhắc nước
- Nhật ký ăn uống theo bữa (Sáng, Trưa, Tối, Snack)
- Thêm món từ thư viện server, gợi ý món ăn

### 3.4. Tab Profile (Cá nhân)

- Thông tin tài khoản và ảnh đại diện
- Chỉnh sửa hồ sơ (tên, ngày sinh, mục tiêu, chiều cao, cân nặng)
- Tóm tắt dinh dưỡng và nước uống hôm nay
- Xuất dữ liệu Excel, xóa tài khoản
- Truy cập **CMS Admin** (nếu là admin)

### 3.5. Thành phần điều hướng chung

- **Header:** Avatar người dùng (vào Profile) và menu 3 gạch
- **App Menu Drawer:** Điều hướng tab, thông báo, admin, đăng xuất
- Bottom nav **ẩn tự động** khi cuộn xuống trên một số màn hình

---

## 4. Công thức sức khỏe chính

| Chỉ số | Công thức |
|---|---|
| BMI | `cân_nặng(kg) / chiều_cao(m)²` |
| BMR (Nam) | `10×kg + 6.25×cm − 5×tuổi + 5` |
| BMR (Nữ) | `10×kg + 6.25×cm − 5×tuổi − 161` |
| TDEE | `BMR × hệ_số_vận_động` (1.2 – 1.9) |
| Calo tập | `MET × kg × giờ` |
| Nước/ngày | `kg × 35 ml` |

Chi tiết triển khai: `src/lib/healthCalculations.ts`, `src/lib/workoutCalculations.ts`.

---
