# Gợi ý cải tiến — Module Workout & Streak

Tài liệu mô tả các hướng chỉnh sửa phù hợp cho module tập luyện và chuỗi ngày tập (streak), dựa trên code hiện tại và cách module Nutrition/Health đã triển khai.

**Phạm vi liên quan:**
- `src/lib/workoutService.ts`
- `src/screens/ProgramsScreen.tsx`
- `src/screens/WorkoutDetailScreen.tsx`
- `src/components/StatsGrid.tsx`
- `App.tsx`

**Tham chiếu:** `docs/health_formulas.md` (nutrition, water, health logic)

---

## 1. Tình trạng hiện tại

| Hạng mục | Trạng thái |
|----------|------------|
| Danh sách chương trình tập | ✅ Có (`ProgramsScreen`) |
| Chi tiết bài tập + timer | ✅ Có (`WorkoutDetailScreen`) |
| Tính calo đốt cháy (MET) | ✅ Có, nhưng hardcode cân nặng 65 kg |
| Ghi log bài tập | ✅ Có (`exercise_logs`) |
| Streak | ✅ Có (`user_streaks`), logic còn thô |
| Migration DB workout | ❌ Chưa có trong repo |
| Tài liệu công thức workout | ❌ Chưa có |
| Tích hợp với profile sức khỏe | ❌ Chưa đầy đủ |
| Lịch tập theo ngày | ⚠️ UI có, chưa gắn dữ liệu |

---

## 2. Công thức & quy tắc nghiệp vụ (nên bổ sung vào docs)

### 2.1 Calo đốt cháy (MET)

```
calo = (MET × 3.5 × cân_nặng_kg / 200) × (thời_gian_giây / 60)
```

**Ví dụ:** MET 8.0, 70 kg, 30 giây → `(8 × 3.5 × 70 / 200) × 0.5 ≈ 4.9 kcal`

**Implementation hiện tại:** `src/lib/workoutService.ts` → `calculateCalories()`

**Cần sửa:** `WorkoutDetailScreen` đang truyền cố định `65` kg thay vì lấy từ profile.

### 2.2 Quy tắc streak (đề xuất chuẩn hóa)

| Tình huống | Hành vi đề xuất |
|------------|-----------------|
| Tập lần đầu | `current_streak = 1` |
| Tập hôm qua, tập tiếp hôm nay | `current_streak += 1` |
| Bỏ tập ≥ 2 ngày | Reset về `1` |
| Tập nhiều lần trong cùng ngày | Giữ nguyên streak, không cộng thêm |
| Hoàn thành buổi tập | Chỉ cập nhật streak **một lần** khi kết thúc cả chương trình |

**Vấn đề hiện tại:** `updateUserStreak()` được gọi sau **mỗi bài tập** trong `logExercise()`, không phải sau buổi tập hoàn chỉnh.

### 2.3 Điều kiện “hoàn thành buổi tập”

Cần thống nhất trong team:

- **Phương án A (đề xuất):** Hoàn thành tất cả bài trong chương trình → mới log streak + summary.
- **Phương án B:** Hoàn thành ≥ 1 bài → tính là đã tập trong ngày.

---

## 3. Gợi ý chỉnh sửa theo mức ưu tiên

### Ưu tiên cao

#### 3.1 Thêm migration Supabase

Tạo file `supabase/migrations/YYYYMMDD_workout_streak.sql` với:

- Bảng `programs` — chương trình tập
- Bảng `exercises` — bài tập thuộc program
- Bảng `exercise_logs` — log theo user, ngày, bài tập
- Bảng `user_streaks` — streak theo user
- RLS: user chỉ đọc/ghi dữ liệu của chính mình (trừ `programs`, `exercises` có thể public read)
- Seed: 1–2 chương trình mẫu + vài bài tập

**Lý do:** Hiện app fallback sang mock khi DB trống hoặc lỗi, khó test và demo thật.

#### 3.2 Dùng cân nặng từ profile

```typescript
// WorkoutDetailScreen — thay vì hardcode 65
const weightKg = profile?.weight_kg ?? 65;
const calories = calculateCalories(met, weightKg, duration);
```

- Lấy profile qua `getProfile(userId)` từ `healthService`
- Đồng bộ với module Health (`docs/health_formulas.md`)

#### 3.3 Sửa logic streak

- Tách `logExercise()` (chỉ ghi log) và `completeWorkoutSession()` (cập nhật streak)
- Gọi `updateUserStreak()` **một lần** khi user hoàn thành buổi tập (Alert “Hoàn thành!”)
- Refresh streak trên Home sau khi đóng `WorkoutDetailScreen`

**File cần sửa:**
- `src/lib/workoutService.ts`
- `src/screens/WorkoutDetailScreen.tsx`
- `App.tsx` hoặc `StatsGrid.tsx` (callback refresh)

#### 3.4 Xử lý lỗi rõ ràng

- `WorkoutDetailScreen` đang `catch` lỗi log mà không báo user
- Nên hiển thị toast/alert khi không ghi được Supabase
- Banner “Đang dùng dữ liệu offline” thay vì im lặng fallback mock

---

### Ưu tiên trung bình

#### 3.5 Lịch tập gắn dữ liệu thật

`ProgramsScreen` có `HorizontalCalendar` nhưng chọn ngày chưa ảnh hưởng gì.

**Đề xuất:**
- Query `exercise_logs` theo tháng
- Đánh dấu ngày đã tập (dot trên calendar)
- Hiển thị “Hôm nay chưa tập” + CTA vào program

#### 3.6 Tích hợp calo đốt cháy vào Home

Tương tự card dinh dưỡng trên `StatsGrid`:

- “Calo đã đốt hôm nay” (sum từ `exercise_logs`)
- Có thể so sánh với TDEE hoặc mục tiêu calo

#### 3.7 Mở rộng streak

Thêm cột hoặc logic:

- `longest_streak` — kỷ lục cá nhân
- Milestone: 7 / 30 / 100 ngày (badge hoặc animation)
- Hiển thị streak trên tab Training, không chỉ Home

#### 3.8 Màn hình Progress (tùy chọn)

Master hiện có tab Nutrition thay cho Progress. Có thể:

- Thêm tab Progress riêng, hoặc
- Gộp biểu đồ calo đốt cháy + lịch sử tập vào Home

---

### Ưu tiên thấp (polish)

#### 3.9 Trải nghiệm tập luyện

- Preload media (video/gif) trước khi bắt đầu
- Âm thanh / rung khi hết giây hoặc chuyển bài
- Màn hình tóm tắt sau buổi tập: tổng calo, thời gian, streak mới
- Cache program offline (AsyncStorage) thay mock cố định

#### 3.10 Test & CI

- Test streak đã có tại `src/lib/__tests__/workoutService.test.ts`
- Thêm script `"test:workout": "jest ..."` hoặc dùng `tsx` tương tự `test:formulas`
- Chạy test trong CI nếu có

---

## 4. Schema DB đề xuất

```sql
-- programs (public read)
create table programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text check (level in ('Beginner', 'Intermediate', 'Advanced')),
  thumbnail_url text,
  created_at timestamptz default now()
);

-- exercises (public read)
create table exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references programs(id) on delete cascade,
  name text not null,
  duration int not null,        -- giây
  met_value numeric not null,
  media_url text,
  created_at timestamptz default now()
);

-- exercise_logs (user-owned)
create table exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  exercise_id uuid references exercises(id),
  workout_date date not null,
  calories_burned numeric not null,
  created_at timestamptz default now()
);

-- user_streaks (user-owned, 1 row per user)
create table user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_workout_date date,
  updated_at timestamptz default now()
);
```

**Index gợi ý:** `(user_id, workout_date)` trên `exercise_logs`.

---

## 5. Roadmap triển khai

```
Giai đoạn 1 — Nền tảng
├── Migration DB + seed data
├── Dùng cân nặng từ profile
└── Sửa logic streak (theo buổi tập)

Giai đoạn 2 — Tích hợp
├── Refresh streak trên Home sau tập
├── Lịch tập hiển thị ngày đã tập
└── Card calo đốt cháy trên StatsGrid

Giai đoạn 3 — Trải nghiệm
├── Màn hình tóm tắt sau buổi tập
├── Milestone streak
└── (Tùy chọn) Tab Progress
```

---

## 6. File cần chỉnh khi triển khai

| File | Việc cần làm |
|------|--------------|
| `supabase/migrations/..._workout_streak.sql` | Tạo mới |
| `src/lib/workoutService.ts` | Tách log / streak, thêm query calo ngày |
| `src/screens/WorkoutDetailScreen.tsx` | Profile weight, complete session, báo lỗi |
| `src/screens/ProgramsScreen.tsx` | Calendar + ngày đã tập |
| `src/components/StatsGrid.tsx` | Calo đốt cháy, refresh streak |
| `App.tsx` | Callback refresh sau workout |
| `src/types/index.ts` | Thêm `longest_streak` nếu mở rộng |
| `docs/workout_formulas.md` | (Tùy chọn) Tách riêng công thức, tham chiếu từ file này |

---

## 7. Lưu ý khi merge nhánh

Nhánh `task-2-workout-streak-module` có **lịch sử commit khác** với `master`. Không merge trực tiếp trên GitHub.

**Cách đúng:** Cherry-pick từng file workout/streak vào `master`, giữ nguyên code nutrition/water. Đã thực hiện qua commit tích hợp trên `master`.

---

## 8. Expo Go & thông báo

Nhắc uống nước (`expo-notifications`) **không chạy trên Expo Go SDK 53+**. Workout/streak không phụ thuộc push notification — vẫn test được trên Expo Go.

Development build cần thiết nếu muốn bật nhắc uống nước thật.

---

*Tài liệu cập nhật: tháng 6/2026 — phản ánh trạng thái sau khi tích hợp workout/streak vào `master`.*
