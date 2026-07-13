# Báo cáo Testcase BVA — Dashboard, Notification, Badges

**Dự án:** FitLife (ELITE FIT)  
**Phương pháp:** Boundary Value Analysis (phân tích giá trị biên)  
**Phạm vi:** Module Người 4 — Dashboard, Notification, Badges  
**Nguồn code:** `DashboardScreen.tsx`, `WeeklyProgressChart.tsx`, `weeklyWorkoutUtils.ts`, `notificationService.ts`, `waterReminderService.ts`, `badgeCalculations.ts`  
**Ngày:** 09/07/2026

---

## 1. Giới thiệu ngắn

**BVA** chọn giá trị tại biên hợp lệ / không hợp lệ để phát hiện lỗi hiển thị số liệu, lập lịch nhắc và cấp huy hiệu.

| Ký hiệu | Ý nghĩa |
|---|---|
| min−1 | Ngay dưới biên dưới (invalid / chưa đạt) |
| min | Biên dưới (valid / vừa đạt) |
| max | Biên trên (valid) |
| max+1 | Ngay trên biên trên (invalid / ngoài miền) |

---

## 2. Ma trận tổng hợp

| Module | Số TC | Biên chính |
|---|---|---|
| Dashboard | 6 | Biểu đồ 7 ngày; 0 buổi / 1 buổi; chuẩn hóa mảng thiếu/đủ |
| Notification | 6 | Expo Go vs Dev build; bật/tắt nhắc; giờ wakeup mặc định 06:30 |
| Badges | 6 | Streak 2/3; buổi tập 0/1; đốt calo 499/500 |
| **Tổng** | **18** | Checklist manual (+ `npm run test:badges`, `npm run test:weekly`) |

---

## 3. Dashboard — 6 testcase

### Biến & miền giá trị

| Biến | Quy tắc trong code | Biên |
|---|---|---|
| Số ngày biểu đồ | Luôn hiển thị **7** ngày (`normalizeWeeklyWorkouts` / fallback) | 0 phần tử / 7 phần tử |
| Tổng buổi tập tuần | `totalWorkouts > 0` → có cột; `= 0` → empty state | 0 / 1 |
| Buổi tập 1 ngày | `workouts > 0` → cột; `= 0` → chấm nhỏ | 0 / 1 |
| `maxWorkouts` | `Math.max(..., 1)` — tránh chia 0 | mọi ngày = 0 vẫn an toàn |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| DASH-01 | Tuần 0 buổi (min) | User chưa tập buổi nào trong 7 ngày | Empty state “Chưa có buổi tập nào”; không cột mờ | |
| DASH-02 | Tuần 1 buổi (min+1 hoạt động) | Đúng 1 ngày có `workouts = 1`, còn lại 0 | Có biểu đồ; 1 cột sáng, 6 chấm nhỏ | |
| DASH-03 | Chuẩn hóa mảng rỗng | RPC/raw trả `[]` hoặc `null` | Client vẫn ra đúng **7** ngày, tất cả = 0 | |
| DASH-04 | Chuẩn hóa đủ 7 ngày | Raw đúng 7 ngày có dữ liệu | Giữ nguyên thứ tự; merge đúng theo `date` | |
| DASH-05 | Date kèm timestamp | `date = "YYYY-MM-DD 00:00:00"` | Chuẩn hóa còn `YYYY-MM-DD`, merge đúng ngày | |
| DASH-06 | Chỉ số nhanh biên 0 | `current_streak = 0`, `workouts_today = 0`, `calories_burned_today = 0` | Dashboard hiển thị **0**, không crash | |

> Đối chiếu nhanh: `npm run test:weekly`.

---

## 4. Notification — 6 testcase

### Biến & miền giá trị

| Biến | Quy tắc trong code | Biên |
|---|---|---|
| Môi trường | Expo Go → không load push workout; nước dùng Alert in-app | Expo Go / Dev build |
| Cờ nhắc | `true` / `false` trên `profiles` | bật / tắt |
| `wakeup_time` | Mặc định **06:30**; parse sai → fallback 6:30 | hợp lệ / sai format |
| Mốc nước | 8 giờ cố định: 7, 9, 11, 13, 15, 17, 19, **21** | mốc đầu 7h / mốc cuối 21h |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| NOTI-01 | Expo Go — bật nhắc tập | Trên Expo Go, bật “Nhắc tập luyện” | Reject / báo không hỗ trợ; app không crash | |
| NOTI-02 | Dev build — bật nhắc tập | Dev/release build, bật nhắc + giờ hợp lệ | Xin quyền OS → lập lịch hàng ngày đúng `wakeup_time` | |
| NOTI-03 | Tắt nhắc tập | Đang bật → tắt công tắc | Hủy lịch local; `workout_reminder_enabled = false` | |
| NOTI-04 | Giờ mặc định / biên parse | `wakeup_time` trống hoặc sai format khi lập lịch | Dùng fallback **06:30** | |
| NOTI-05 | Nhắc nước — mốc biên | Bật nhắc nước (Dev build) | Lập **8** mốc; đầu **7:00**, cuối **21:00** | |
| NOTI-06 | Expo Go — nhắc nước | Bật nhắc nước trên Expo Go | Không crash; dùng Alert in-app khi app đang mở (không phải push OS) | |

---

## 5. Badges — 6 testcase

### Biến & miền giá trị

| Huy hiệu | `criteria_type` | Biên `criteria_value` |
|---|---|---|
| Buổi tập đầu | `workout_sessions` | 0 / **1** |
| Kiên trì 3 ngày | `streak` | 2 / **3** |
| Đốt cháy | `calories_burned_day` | 499 / **500** |
| Khởi đầu | `onboarding` | false / true |

| ID | Trường / biên | Input | Kỳ vọng | Kết quả |
|---|---|---|---|---|
| BADGE-01 | Streak min−1 | `currentStreak = 2`, badge streak_3 | **Chưa đạt** (mờ) | |
| BADGE-02 | Streak min | `currentStreak = 3`, badge streak_3 | **Đạt** — cấp “Kiên trì 3 ngày” | |
| BADGE-03 | Buổi tập min−1 | `workoutSessions = 0` | Chưa đạt “Buổi tập đầu” | |
| BADGE-04 | Buổi tập min | `workoutSessions = 1` | Đạt “Buổi tập đầu” | |
| BADGE-05 | Calo đốt min−1 | `maxCaloriesBurnedDay = 499` | Chưa đạt “Đốt cháy” | |
| BADGE-06 | Calo đốt min | `maxCaloriesBurnedDay = 500` | Đạt “Đốt cháy” (≥ 500) | |

> Đối chiếu nhanh: `npm run test:badges` (hiện cover streak 2/3).

---

## 6. Cách ghi nhận

1. Chạy từng ID; ghi **Pass / Fail** vào cột Kết quả.
2. Dashboard: mở tab Home, pull-to-refresh; kiểm empty state / cột.
3. Notification: thử trên **Expo Go** và **development build** (khác nhau rõ).
4. Badges: hoàn thành buổi tập / chỉnh streak hoặc đối chiếu unit test.
5. Fail: ghi kèm ảnh màn hình + message Alert / trạng thái badge.

### Lệch hành vi cần nhớ

| Điểm | Hành vi thực tế |
|---|---|
| Biểu đồ 0 buổi | Empty state chữ, **không** vẽ cột mờ 8px |
| Số ngày biểu đồ | Client luôn chuẩn hóa về **7** ngày theo timezone máy |
| Thông báo trên Expo Go | Nhắc tập **không bật được**; nhắc nước = Alert in-app |
| Thông báo badge | Local notification; lần mount Dashboard đầu có thể coi badge cũ là “mới” |
| Cấp badge | So sánh `>= criteria_value` (đúng biên min là đạt) |
| WorkoutCard trên Dashboard | Hard-code — không dùng để assert tiến độ thật |

---

*Báo cáo BVA — Dashboard 6, Notification 6, Badges 6 (Người 4).*
