---
title: "Tài liệu Đặc tả Chức năng — FitLife"
author: "FitLife"
date: "08/07/2026"
lang: vi
---

**Ứng dụng:** Di động Tập thể dục & Sức khỏe (FitLife / ELITE FIT)  
**Nền tảng:** React Native (Expo SDK 54)  
**Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)  
**Phiên bản tài liệu:** Cập nhật theo codebase — 08/07/2026

> **Lưu ý thương hiệu:** Tài liệu dùng tên dự án **FitLife**; giao diện app hiện hiển thị **ELITE FIT** (Login, Header, Menu).

## Tổng quan ứng dụng

Ứng dụng **FitLife** là giải pháp trên điện thoại thông minh giúp người dùng theo dõi chế độ tập luyện cá nhân hóa, quản lý dinh dưỡng, lượng nước uống hàng ngày và duy trì thói quen lành mạnh thông qua hệ thống nhắc nhở và huy hiệu thành tích.

Dữ liệu người dùng (hồ sơ, buổi tập, dinh dưỡng, nước uống, huy hiệu) được lưu trữ và đồng bộ trên **Supabase**. Chương trình tập, bài tập và thư viện món ăn được quản trị tập trung trên server; ứng dụng tải media minh họa (ảnh động GIF hoặc video MP4) khi người dùng mở buổi tập.

### Kiến trúc tổng quan

**Tầng 1 — Giao diện:** Dashboard, Training, Nutrition, Profile, Admin CMS  
**Tầng 2 — Service:** `dashboardService`, `badgeService`, `nutritionService`, `notificationService`…  
**Tầng 3 — Supabase:** PostgreSQL + RLS + Storage + Edge Functions

Màn hình **không** gọi database trực tiếp — luôn qua lớp service. Mỗi user chỉ thấy dữ liệu của mình nhờ **Row Level Security (RLS)**.

## Các chức năng chính của ứng dụng

### Luồng Đăng nhập, Đăng ký & Khởi tạo Hồ sơ (Onboarding Flow)

Luồng thu thập chỉ số cơ thể ban đầu để cá nhân hóa lộ trình tập luyện và dinh dưỡng.

| Giai đoạn / Màn hình | Chi tiết các trường thông tin & Tính năng |
|---|---|
| **Màn hình Đăng nhập / Đăng ký** | Đăng nhập hoặc đăng ký bằng **Email + Mật khẩu** (Supabase Auth). Hỗ trợ **Quên mật khẩu** (gửi email đặt lại). Nút **Google** và **Apple** hiển thị trên giao diện nhưng hiện chỉ báo *"Tính năng đang phát triển"*. |
| **Đăng ký Tài khoản** | Email, mật khẩu tối thiểu **8 ký tự** (chữ hoa, số, ký tự đặc biệt) và xác nhận mật khẩu. |
| **Đăng nhập** | Chỉ kiểm tra mật khẩu tối thiểu **6 ký tự** (lỏng hơn quy tắc đăng ký). |
| **Onboarding — Bước 1** | Họ và tên, ngày sinh (tính tuổi), giới tính (Nam / Nữ / Khác). |
| **Onboarding — Bước 2** | Chiều cao (cm), cân nặng (kg). Tự động tính **BMI**, **BMR** (Mifflin-St Jeor), **TDEE** và macro mục tiêu. |
| **Onboarding — Bước 3** | Mục tiêu: Giảm cân, Tăng cơ, Duy trì, **Tăng sức bền** (`improve_cardio`), Linh hoạt. Mức vận động hàng tuần: 5 mức (Ít vận động → Rất nhiều). Sau khi hoàn thành, cờ `onboarding_completed = true` lưu vào `profiles`. |

**Bổ sung:** Nếu migration chưa chạy (thiếu cột `onboarding_completed`), `App.tsx` hiển thị màn hình lỗi schema với nút **Thử lại** và **Đăng xuất**.

### Chuỗi Ngày Tập liên tục (Streaks)

Hệ thống theo dõi chuỗi ngày tập liên tiếp khi hoàn thành buổi tập.

- **Cơ chế:** RPC `complete_workout_session` ghi `workout_sessions` và cập nhật `user_streaks`. Tập ngày liên tiếp → **streak +1**; bỏ lỡ một ngày → reset về **1** khi tập lại.
- **Hiển thị:** Streak hiện tại và kỷ lục dài nhất trên tab **Home** (Dashboard), qua RPC `get_dashboard_summary`.
- **Huy hiệu liên quan:** Kiên trì 3 ngày, Tuần vàng (7 ngày), Thép không gỉ (30 ngày).

> **Lưu ý:** Không khóa bài tập theo lịch từng ngày. User chọn chương trình bất kỳ lúc nào từ tab Training. Buổi tập từ **5 chương trình offline mẫu** (`mock-p1`…`mock-p5`) **không** ghi session/streak lên server.

### Chương trình Tập luyện & Bài tập từ Server

Dữ liệu lưu trên Supabase (`programs`, `exercises`).

| Tính năng | Mô tả |
|---|---|
| **Danh sách chương trình** | Tab **Training** tải từ server (tiêu đề, mô tả, cấp độ Beginner/Intermediate/Advanced, thumbnail). Timeout 10s hoặc lỗi mạng → **5 chương trình mẫu offline** (`MOCK_PROGRAMS`). |
| **Lịch ngang** | **7 ngày trong tuần hiện tại** (Thứ 2 → Chủ nhật), không phải “3 ngày trước/sau hôm nay”. Gợi ý chương trình theo mục tiêu/BMI; **5 ngày tập, 2 ngày nghỉ** (Thứ 4 & Chủ nhật). Đánh dấu ngày đã hoàn thành buổi tập. |
| **Buổi tập chi tiết** | Danh sách bài: tên, thời lượng, **MET**, `media_url` (GIF hoặc MP4). Video qua `expo-video`; ảnh/GIF qua `Image`. |
| **Luồng tập** | Đếm ngược từng bài → nghỉ **15 giây** giữa hiệp → chuyển bài → hoàn thành buổi tập. Hỗ trợ tạm dừng và bỏ qua bài. |
| **Tính calo** | `Calo = MET x kg x gio`; cân nặng lấy từ hồ sơ (mặc định 65 kg nếu thiếu). |
| **Ghi nhận** | `exercise_logs` từng bài; `complete_workout_session` khi kết thúc (chỉ chương trình server). Dashboard tự refresh qua `refreshKey`. |

### Nhắc nhở & Thông báo (Notifications)

Triển khai qua **expo-notifications** (local push). Cài đặt mở từ **nút chuông Dashboard** hoặc **menu 3 gạch → Thông báo**.

| Loại nhắc | Mô tả |
|---|---|
| **Nhắc tập luyện** | Bật/tắt và chọn **giờ nhắc** (`wakeup_time`, mặc định 06:30). Lịch lặp hàng ngày (CALENDAR trigger). |
| **Nhắc uống nước** | **8 mốc/ngày:** 7h, 9h, 11h, 13h, 15h, 17h, 19h, 21h (mỗi 2 giờ, mốc cuối 21h). Bật/tắt từ tab Dinh dưỡng hoặc modal thông báo. |
| **Thông báo huy hiệu** | Local notification khi mở khóa badge mới (có thể tắt). |

**Lưu trữ:** Cờ bật/tắt và `wakeup_time` trong `profiles`; id lịch local trong **AsyncStorage**.

**Giới hạn Expo Go:**

| Loại | Expo Go | Development build / Release |
|---|---|---|
| Nhắc tập | Không bật được (báo lỗi hướng dẫn) | Push notification đầy đủ |
| Nhắc nước | **Alert trong app** khi đang mở (kiểm tra mỗi 60s) | 8 push notification lặp ngày |
| Thông báo badge | Không gửi | Gửi ngay khi đạt badge mới |

Sau đăng nhập + onboarding, `App.tsx` gọi `syncAllRemindersOnLaunch` để khôi phục lịch từ cờ server.

### Định lượng Thức ăn & Dinh dưỡng hàng ngày (Nutrition Tracker)

Dựa trên TDEE và mục tiêu tập luyện.

- **Mục tiêu calo:** TDEE điều chỉnh theo mục tiêu (Giảm cân −400, Tăng cơ +300…). Tối thiểu **1200 kcal/ngày**.
- **Macro:** Protein **30%**, Carbs **45%**, Fat **25%**.
- **Nhật ký ăn uống:** Thêm món từ thư viện server vào **Sáng, Trưa, Tối**. Database hỗ trợ bữa `snack` nhưng **giao diện chưa hiển thị** bữa ăn vặt.
- **Gợi ý món ăn:** Đề xuất 3 bữa/ngày (thuật toán keyword + xáo trộn theo ngày); nút **Áp dụng bữa** thêm nhanh vào nhật ký.
- **Biểu đồ:** Vòng calo (`CalorieRing`) và biểu đồ tròn macro.
- **Cảnh báo:** Banner `LimitAdjustHint` khi vượt calo/macro; chặn thêm món khi vượt ngưỡng calo (`limitWarnings.ts`).

### Theo dõi Lượng nước uống hàng ngày (Water Tracker)

- **Công thức:** Cân nặng (kg) x 35 ml = lượng nước cần uống mỗi ngày. Mặc định **2000 ml** khi chưa có cân nặng.
- **Tương tác:** Thanh tiến độ; **+250 ml** / **+500 ml**; tùy chọn **đặt về mục tiêu** khi vượt ngưỡng (tab Dinh dưỡng và widget Dashboard).
- **Vị trí:** Tab **Dinh dưỡng**, tab **Cá nhân**, widget **Sức khỏe hôm nay** trên Dashboard.
- **Lưu trữ:** RPC `add_water_intake`, bảng `daily_water_intake`.

### Hệ thống Huy hiệu (Badges)

**8 huy hiệu mặc định** (seed migration), tự kiểm tra và cấp mỗi lần mở Dashboard (`syncUserBadges`):

| Mã | Tên | Điều kiện |
|---|---|---|
| `onboarding_complete` | Khởi đầu | Hoàn thành onboarding |
| `first_workout` | Buổi tập đầu | Hoàn thành >= 1 buổi tập |
| `streak_3` | Kiên trì 3 ngày | Streak >= 3 ngày |
| `streak_7` | Tuần vàng | Streak >= 7 ngày |
| `streak_30` | Thép không gỉ | Streak >= 30 ngày |
| `water_goal` | Hydration Pro | Đạt mục tiêu nước trong 1 ngày |
| `nutrition_goal` | Dinh dưỡng chuẩn | Đạt mục tiêu calo trong 1 ngày |
| `burn_500` | Đốt cháy | Đốt >= 500 kcal trong 1 ngày |

Huy hiệu hiển thị trên tab **Home** (sáng = đã đạt, mờ = chưa đạt). Badge mới có thể kèm thông báo push (nếu bật).

> **Lưu ý:** Seed bổ sung thêm badge khóa học (`course_30_complete`, `course_60_complete`) trong CMS — **chưa có logic tự cấp** trong app. Khi không tải được bảng `badges`, fallback chỉ có **4 huy hiệu** đầu (`badgeCatalog.ts`).

### Quản trị & Tiện ích bổ sung

| Tính năng | Mô tả |
|---|---|
| **Menu ứng dụng** | Drawer điều hướng tab, mở cài đặt thông báo, đăng xuất. |
| **CMS Admin** | Tài khoản `profiles.role = 'admin'` truy cập màn hình quản trị: trạng thái CMS, chương trình, bài tập, khóa học (`workout_courses`), món ăn, huy hiệu, media, import CSV. |
| **Chỉnh sửa hồ sơ** | Cập nhật **tên, ngày sinh, mục tiêu tập**; hệ thống tính lại chỉ số sức khỏe. **Chiều cao/cân nặng** chỉ nhập lúc onboarding (chưa có form sửa trên Profile). |
| **Ảnh đại diện** | Chụp/chọn ảnh → upload bucket `avatars` → cập nhật `profiles.avatar_url`. |
| **Xuất dữ liệu** | Edge Function `export-user-data` → file **Excel (.xlsx)** nhiều sheet, chia sẻ qua `expo-sharing`. |
| **Xóa tài khoản** | Edge Function `delete-account` (xác nhận `DELETE`) → xóa vĩnh viễn user Auth và dữ liệu liên quan. |
| **Khóa tập hiện tại (Profile)** | Hiển thị từ `user_courses` + `workout_courses` — **chưa có luồng đăng ký khóa** và tiến độ **không đồng bộ** từ buổi tập thường. |

## Kiến trúc Giao diện Ứng dụng (UI Architecture)

Ứng dụng dùng **Bottom Navigation Bar** với **4 tab** chính.

### Tab Home (Dashboard)

| Thành phần | Nguồn dữ liệu |
|---|---|
| Lời chào + ngày hiện tại | RPC `get_dashboard_summary` (`display_name`) |
| **Chỉ số nhanh:** Streak, Calo đốt, Buổi tập, Kỷ lục | RPC (fallback: `dashboardService`) |
| **Biểu đồ 7 ngày** | `weekly_workouts` — luôn 7 ngày; empty state khi chưa tập |
| **Buổi tập** | **Hard-code** (`WorkoutCard`: "Power Strength II", 12/24, 50%) — phím tắt vào Training |
| **Sức khỏe hôm nay** | `StatsGrid` tải riêng: calo, nước, macro, giờ nhắc tập |
| **Huy hiệu** | `syncUserBadges` — lưới đã mở khóa / tổng số |
| Nút chuông | Mở `NotificationSettingsModal` |
| Kéo xuống refresh | Tải lại summary + badge |

### Tab Training (Lịch tập & Chương trình)

- Lịch ngang **7 ngày trong tuần** + gợi ý chương trình theo ngày
- Danh sách chương trình từ server (hoặc 5 mẫu offline)
- Chạm chương trình → **WorkoutDetailScreen** (video/GIF, timer, calo, hoàn thành buổi tập)

> Không có tab riêng “Phòng tập”. Toàn bộ bài tập nằm trong từng chương trình.

### Tab Nutrition (Dinh dưỡng)

- Vòng calo và biểu đồ macro
- Theo dõi nước (+250 ml / +500 ml) và bật/tắt nhắc nước
- Nhật ký **Sáng, Trưa, Tối** + gợi ý món ăn
- Thêm món từ thư viện server (`foods`, `is_custom = false`)

### Tab Profile (Cá nhân)

- Thông tin tài khoản, ảnh đại diện, badge “PRO” (trang trí)
- Chỉnh sửa: tên, ngày sinh, mục tiêu tập
- Tóm tắt dinh dưỡng và nước hôm nay
- Khóa tập hiện tại (read-only, nếu có dữ liệu)
- Xuất Excel, xóa tài khoản, đăng xuất
- Truy cập **CMS Admin** (nếu admin)

### Thành phần điều hướng chung

- **Header:** Logo ELITE FIT, avatar (vào Profile), menu 3 gạch
- **App Menu Drawer:** Điều hướng tab, thông báo, đăng xuất
- **Bottom nav:** Ẩn khi cuộn **đến cuối** danh sách (`useHideOnScroll`)
- **AdminScreen:** Overlay toàn màn hình (không phải tab)

## Backend và Cơ sở dữ liệu

### Migrations (thứ tự chạy)

1. **`20260627000000_nutrition_water_health.sql`** — `foods`, `meal_logs`, `daily_nutrition`, `daily_water_intake`, RPC dinh dưỡng/nước
2. **`20260627173357_workout_onboarding_atomic_updates.sql`** — `programs`, `exercises`, `workout_sessions`, `user_streaks`, `complete_workout_session`, avatars
3. **`20260627200000_dashboard_badges_notifications.sql`** — `badges`, `user_badges`, RPC `get_dashboard_summary`, cờ nhắc nhở
4. **`20260701100000_add_new_programs_v2.sql`** — Seed chương trình/bài tập bổ sung
5. **`20260702100000_admin_cms_security.sql`** — `profiles.role`, RLS admin, storage CMS

### Edge Functions

| Function | Mục đích |
|---|---|
| `export-user-data` | Xuất toàn bộ dữ liệu user (JSON → Excel trên client) |
| `delete-account` | Xóa vĩnh viễn tài khoản |
| `cms-status` | Health check + thống kê CMS (Admin) |
| `media-upload` | Upload media admin lên Storage |
| `todos` | Demo scaffold — **chưa dùng trong app** |

### Bảo mật

- **RLS:** User chỉ đọc/ghi dữ liệu của mình; admin qua `is_admin()`.
- **RPC:** `get_dashboard_summary` dùng `auth.uid()`, SECURITY INVOKER.
- **Storage:** Bucket `avatars` (user), bucket CMS (admin).

## Công thức sức khỏe chính

| Chỉ số | Công thức |
|---|---|
| BMI | cân_nặng(kg) / chiều_cao(m)^2 |
| BMR (Nam) | 10 x kg + 6.25 x cm - 5 x tuoi + 5 |
| BMR (Nữ) | 10 x kg + 6.25 x cm - 5 x tuoi - 161 |
| TDEE | BMR x hệ_số_vận_động (1.2 - 1.9) |
| Calo tập | MET x kg x giờ |
| Nước/ngày | kg x 35 ml (tối thiểu logic 2000 ml) |

Chi tiết triển khai: `src/lib/healthCalculations.ts`, `src/lib/workoutCalculations.ts`.

## Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `npm run test:formulas` | Công thức BMI/BMR/TDEE/macro |
| `npm run test:workout` | Logic workout service |
| `npm run test:badges` | `isBadgeEarned` (streak) |
| `npm run test:weekly` | `normalizeWeeklyWorkouts` |
| `npm test` | Chạy tất cả test trên |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run test:cms-all` | RLS + bảo mật CMS |

## Tính năng đã triển khai vs. đang phát triển

| Đã triển khai đầy đủ | Stub / chưa hoàn thiện |
|---|---|
| Email đăng nhập/đăng ký, quên mật khẩu | Google / Apple OAuth |
| Onboarding 3 bước → profiles | Sửa chiều cao/cân nặng trên Profile |
| Programs + exercises từ server | `WorkoutCard` hard-code trên Dashboard |
| `complete_workout_session` + streak | Mock program không ghi DB |
| Nutrition 3 bữa + gợi ý món | UI bữa Snack |
| Water tracker + nhắc nước | Push notification trên Expo Go |
| 8 huy hiệu core + sync tự động | Badge khóa học tự cấp |
| Export Excel, xóa tài khoản | `user_courses` enrollment/progress |
| Admin CMS (8 mục) | Edge function `todos` (demo) |
| Avatar upload | |

---
