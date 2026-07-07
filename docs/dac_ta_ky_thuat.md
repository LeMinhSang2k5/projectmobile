# Tài liệu Đặc tả Kỹ thuật — Module Dashboard, Notification & Badges (Người 4)

> Tài liệu này đặc tả chi tiết **module của Người 4** trong dự án FitLife theo bản phân công: **Dashboard (trang chủ tổng quan), Notification (nhắc nhở/thông báo) và Badges (huy hiệu thành tích)**.
> Phạm vi gồm cả 3 lớp: **Frontend** (widget Dashboard, huy hiệu, cài đặt nhắc nhở, snapshot tiến độ), **Backend** (Dashboard summary API, Badge API, Notification prefs/scheduler) và **Test** (thông báo, quyền thông báo, badge/stats).
>
> Ứng dụng: **React Native (Expo)** + backend **Supabase (PostgreSQL)**.

---

## Mục lục

1. [Phạm vi module & sơ đồ tổng quan](#1-phạm-vi-module--sơ-đồ-tổng-quan)
2. [Các file thuộc module](#2-các-file-thuộc-module)
3. [Backend — Database & RPC](#3-backend--database--rpc)
4. [Module Dashboard](#4-module-dashboard)
5. [Module Badges (Huy hiệu)](#5-module-badges-huy-hiệu)
6. [Module Notification (Thông báo)](#6-module-notification-thông-báo)
7. [Luồng hoạt động end-to-end](#7-luồng-hoạt-động-end-to-end)
8. [Kế hoạch & checklist kiểm thử](#8-kế-hoạch--checklist-kiểm-thử)
9. [Vận hành & lưu ý](#9-vận-hành--lưu-ý)

---

## 1. Phạm vi module & sơ đồ tổng quan

Theo bản phân công, Người 4 phụ trách:

| Lớp | Hạng mục |
|---|---|
| **Frontend** | Dashboard widgets, badges, nhắc nhở, snapshot tiến độ |
| **Backend** | Dashboard summary API, badge API, notification prefs/scheduler |
| **Test** | Notification, quyền thông báo, badge/stats — và **test chéo CMS/Admin của Người 5** |

Sơ đồ luồng dữ liệu của module:

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND                                                     │
│                                                              │
│  DashboardScreen ──┬─ StatsGrid                              │
│   (tab Home)       ├─ WeeklyProgressChart  (snapshot 7 ngày) │
│                    ├─ WorkoutCard          (khóa tập hiện tại)│
│                    └─ BadgeGrid            (huy hiệu)         │
│                                                              │
│  AppMenuDrawer ─► NotificationSettingsModal (bật/tắt nhắc)   │
│                                                              │
│         │ gọi services                                       │
│         ▼                                                     │
│  dashboardService   badgeService   notificationService       │
│         │                │                │                  │
└─────────┼────────────────┼────────────────┼─────────────────┘
          ▼                ▼                ▼
   RPC get_dashboard   bảng badges /   expo-notifications
   _summary()          user_badges     (lazy-load) + bảng
                       + isBadgeEarned  profiles (cờ nhắc nhở)
                              │
                       ┌──────┴──────┐
                       ▼  SUPABASE   ▼
              PostgreSQL + RLS + RPC (SECURITY INVOKER)
```

---

## 2. Các file thuộc module

| Lớp | File | Vai trò |
|---|---|---|
| **Backend (SQL)** | `supabase/migrations/20260627200000_dashboard_badges_notifications.sql` | Tạo bảng `badges`/`user_badges`, thêm cờ nhắc nhở vào `profiles`, RPC `get_dashboard_summary()`, seed 8 huy hiệu |
| **Service** | `src/services/dashboardService.ts` | Lấy & chuẩn hóa số liệu Dashboard |
| **Service** | `src/services/badgeService.ts` | Lấy/đồng bộ huy hiệu |
| **Service** | `src/services/notificationService.ts` | Quản lý nhắc tập, prefs, thông báo badge |
| **Service** | `src/services/waterReminderService.ts` | Nhắc uống nước (lập lịch) |
| **Lib (thuần)** | `src/lib/badgeCalculations.ts` | Hàm `isBadgeEarned` |
| **Lib (thuần)** | `src/lib/badgeCatalog.ts` | Danh mục huy hiệu fallback offline |
| **Lib (thuần)** | `src/lib/dateUtils.ts` | Xử lý ngày theo timezone local, `normalizeDateString` |
| **Screen** | `src/screens/DashboardScreen.tsx` | Màn hình tab Home |
| **Component** | `src/components/WeeklyProgressChart.tsx` | Biểu đồ 7 ngày (snapshot tiến độ) |
| **Component** | `src/components/StatsGrid.tsx` | Lưới chỉ số (calo, buổi tập, kỷ lục) |
| **Component** | `src/components/BadgeGrid.tsx` | Lưới huy hiệu |
| **Component** | `src/components/NotificationSettingsModal.tsx` | Cài đặt nhắc nhở |
| **Type** | `src/types/index.ts` | `DashboardSummary`, `WeeklyWorkoutDay`, `Badge`, `UserBadge`, `BadgeWithStatus`, `NotificationPreferences` |
| **Test** | `src/lib/__tests__/badgeLogic.test.ts` | Unit test logic huy hiệu |

---

## 3. Backend — Database & RPC

Toàn bộ backend của module nằm trong migration `20260627200000_dashboard_badges_notifications.sql`.

### 3.1. Mở rộng bảng `profiles` (cờ thông báo)

```sql
alter table public.profiles
  add column if not exists workout_reminder_enabled boolean not null default false,
  add column if not exists badge_notifications_enabled boolean not null default true;
```

- `workout_reminder_enabled` — bật nhắc tập luyện.
- `badge_notifications_enabled` — cho phép bắn thông báo khi mở khóa huy hiệu (mặc định bật).
- (Cột `water_reminder_enabled` và `wakeup_time` đã có từ migration trước, module này dùng lại.)

### 3.2. Bảng `badges` (danh mục huy hiệu)

```sql
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- mã định danh ổn định
  title text not null,                -- tên hiển thị
  description text not null,
  icon text not null default 'emoji-events',  -- tên icon MaterialIcons
  criteria_type text not null,        -- loại điều kiện đạt
  criteria_value integer not null default 1,  -- ngưỡng đạt
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
```

### 3.3. Bảng `user_badges` (huy hiệu đã đạt)

```sql
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)          -- mỗi badge chỉ đạt 1 lần
);
create index if not exists user_badges_user_id_idx on public.user_badges (user_id);
```

### 3.4. RLS cho badges

```sql
-- Ai đăng nhập cũng đọc được danh mục badge
create policy badges_read_authenticated on public.badges
  for select to authenticated using (true);

-- User chỉ xem/cấp huy hiệu của chính mình
create policy user_badges_select_own on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_badges_insert_own on public.user_badges
  for insert to authenticated with check ((select auth.uid()) = user_id);
```

### 3.5. Seed 8 huy hiệu mặc định

`INSERT … ON CONFLICT (code) DO UPDATE` để chạy lại migration không tạo trùng:

| code | Tên | criteria_type | value |
|---|---|---|---|
| `onboarding_complete` | Khởi đầu | `onboarding` | 1 |
| `first_workout` | Buổi tập đầu | `workout_sessions` | 1 |
| `streak_3` | Kiên trì 3 ngày | `streak` | 3 |
| `streak_7` | Tuần vàng | `streak` | 7 |
| `streak_30` | Thép không gỉ | `streak` | 30 |
| `water_goal` | Hydration Pro | `water_goal_days` | 1 |
| `nutrition_goal` | Dinh dưỡng chuẩn | `nutrition_goal_days` | 1 |
| `burn_500` | Đốt cháy | `calories_burned_day` | 500 |

### 3.6. RPC `get_dashboard_summary()` — Dashboard summary API

Trả về **một JSON duy nhất** chứa mọi số liệu Dashboard cần, giảm số round-trip mạng.

```sql
create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
security invoker          -- giữ RLS, chạy theo quyền người gọi
set search_path = ''      -- chống chiếm quyền qua search path
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_today date := current_date;
  ...
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- 1) Hồ sơ (display_name, wakeup_time, các cờ nhắc nhở)
  select * into v_profile from public.profiles where id = v_user_id;

  -- 2) Streak hiện tại & dài nhất
  select coalesce(current_streak,0), coalesce(longest_streak,0)
    into v_streak, v_longest_streak
    from public.user_streaks where user_id = v_user_id;

  -- 3) Calo đốt & số buổi tập HÔM NAY
  select coalesce(sum(total_calories),0), count(*)
    into v_calories_burned_today, v_workouts_today
    from public.workout_sessions
    where user_id = v_user_id and workout_date = v_today;

  -- 4) Snapshot 7 NGÀY: generate_series + LEFT JOIN LATERAL
  --    → luôn đủ 7 ngày kể cả ngày không tập (workouts = 0)
  select coalesce(jsonb_agg(jsonb_build_object(
           'date', day::text,
           'workouts', coalesce(ws.count,0),
           'calories_burned', coalesce(ws.calories,0)
         ) order by day), '[]'::jsonb)
    into v_weekly_workouts
    from generate_series(v_today - 6, v_today, interval '1 day') as day
    left join lateral (
      select count(*)::int as count, coalesce(sum(total_calories),0) as calories
      from public.workout_sessions
      where user_id = v_user_id and workout_date = day::date
    ) ws on true;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'current_streak', v_streak,
    'longest_streak', v_longest_streak,
    'calories_burned_today', v_calories_burned_today,
    'workouts_today', v_workouts_today,
    'weekly_workouts', v_weekly_workouts,
    'wakeup_time', v_profile.wakeup_time,
    'water_reminder_enabled', coalesce(v_profile.water_reminder_enabled,false),
    'workout_reminder_enabled', coalesce(v_profile.workout_reminder_enabled,false),
    'badge_notifications_enabled', coalesce(v_profile.badge_notifications_enabled,true)
  );
end;
$$;

revoke all on function public.get_dashboard_summary() from public, anon;
grant execute on function public.get_dashboard_summary() to authenticated;
```

> **Điểm kỹ thuật:** `generate_series` + `LEFT JOIN LATERAL` đảm bảo trả đúng 7 phần tử cho mọi ngày trong tuần — đây là nền tảng để biểu đồ snapshot không bị thiếu ngày.

---

## 4. Module Dashboard

### 4.1. Type dữ liệu (`types/index.ts`)

```typescript
export type WeeklyWorkoutDay = {
  date: string;            // 'YYYY-MM-DD'
  workouts: number;        // số buổi tập trong ngày
  calories_burned: number; // calo đốt trong ngày
};

export type DashboardSummary = {
  display_name: string | null;
  current_streak: number;
  longest_streak: number;
  calories_burned_today: number;
  workouts_today: number;
  weekly_workouts: WeeklyWorkoutDay[];  // luôn 7 phần tử
  wakeup_time: string;
  water_reminder_enabled: boolean;
  workout_reminder_enabled: boolean;
  badge_notifications_enabled: boolean;
};
```

### 4.2. `dashboardService.ts`

**`getDashboardSummary(userId)`** — ưu tiên RPC, có fallback client:

```typescript
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('get_dashboard_summary');
  if (!error && data) {
    const summary = data as DashboardSummary;
    return {
      ...summary,
      weekly_workouts: normalizeWeeklyWorkouts(summary.weekly_workouts),
    };
  }
  return buildDashboardSummaryClient(userId);  // RPC lỗi → tự gom phía client
}
```

**`normalizeWeeklyWorkouts(raw)`** — chuẩn hóa luôn đủ 7 ngày, khớp theo ngày, điền 0 cho ngày thiếu (chống biểu đồ rỗng/lệch do dữ liệu thiếu hoặc `date` kèm timestamp):

```typescript
export function normalizeWeeklyWorkouts(raw: unknown): WeeklyWorkoutDay[] {
  const base = EMPTY_WEEKLY();                 // mảng 7 ngày gần nhất, value 0
  if (!Array.isArray(raw) || raw.length === 0) return base;

  const map = new Map(base.map((d) => [d.date, { ...d }]));
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const date = normalizeDateString(String(row.date ?? '')); // cắt còn YYYY-MM-DD
    if (!map.has(date)) continue;
    map.set(date, {
      date,
      workouts: Number(row.workouts ?? 0),
      calories_burned: Number(row.calories_burned ?? 0),
    });
  }
  return base.map((d) => map.get(d.date) ?? d);
}
```

**`buildDashboardSummaryClient(userId)`** — fallback khi RPC lỗi: chạy `Promise.all` đọc `profiles`, `user_streaks`, `workout_sessions` (7 ngày) rồi tự gom thành `DashboardSummary` y hệt RPC.

### 4.3. `DashboardScreen.tsx`

Tải dữ liệu song song và xử lý thông báo huy hiệu mới:

```typescript
const loadDashboard = useCallback(async () => {
  const [dashboard, badgeList, prefs] = await Promise.all([
    getDashboardSummary(userId),
    syncUserBadges(userId),                       // cấp badge mới nếu đủ điều kiện
    getNotificationPreferences(userId).catch(() => null),
  ]);

  setSummary(dashboard);
  setBadges((previous) => {
    if (prefs?.badge_notifications_enabled) {
      const previousEarned = new Set(previous.filter(b => b.earned).map(b => b.id));
      for (const badge of badgeList) {
        if (badge.earned && !previousEarned.has(badge.id)) {
          void notifyBadgeEarned('Huy hiệu mới', `Bạn vừa mở khóa "${badge.title}"`);
        }
      }
    }
    return badgeList;
  });
}, [userId]);
```

Màn hình hiển thị: `StatsGrid` (calo/buổi tập/kỷ lục) + `WeeklyProgressChart` + `WorkoutCard` (khóa tập hiện tại) + `BadgeGrid`. Hỗ trợ **pull-to-refresh** (`RefreshControl`). `refreshKey` từ `App.tsx` tăng sau khi hoàn thành buổi tập → tự tải lại.

### 4.4. `WeeklyProgressChart.tsx` — snapshot tiến độ 7 ngày

- Nhận `days: WeeklyWorkoutDay[]`; nếu không đủ 7 thì tự dựng fallback 7 ngày.
- **Empty state:** khi tổng số buổi tập = 0 → hiển thị thông điệp "Chưa có buổi tập nào" thay vì cột mờ vô nghĩa.
- Luôn vẽ nhãn ngày (CN–T7), **highlight ngày hôm nay**, cột có viền rõ; cột rỗng hiển thị chấm nhỏ thay vì cột cao mờ.
- Tóm tắt phía trên: tổng số buổi tập & tổng kcal trong 7 ngày.

### 4.5. `StatsGrid.tsx`

Lưới chỉ số trong ngày. Có prop `showStreak` — trên Dashboard đặt `false` để **tránh trùng** streak (streak đã hiển thị ở khu vực riêng).

---

## 5. Module Badges (Huy hiệu)

### 5.1. Type

```typescript
export type Badge = {
  id: string; code: string; title: string; description: string;
  icon: string; criteria_type: string; criteria_value: number; sort_order: number;
};
export type BadgeWithStatus = Badge & { earned: boolean; earned_at: string | null };
```

### 5.2. `badgeCalculations.ts` — logic thuần (có unit test)

```typescript
export function isBadgeEarned(badge: Badge, stats: BadgeStats): boolean {
  switch (badge.criteria_type) {
    case 'onboarding':          return stats.onboardingComplete;
    case 'workout_sessions':    return stats.workoutSessions   >= badge.criteria_value;
    case 'streak':              return stats.currentStreak     >= badge.criteria_value;
    case 'water_goal_days':     return stats.waterGoalDays     >= badge.criteria_value;
    case 'nutrition_goal_days': return stats.nutritionGoalDays >= badge.criteria_value;
    case 'calories_burned_day': return stats.maxCaloriesBurnedDay >= badge.criteria_value;
    default:                    return false;
  }
}
```

Tách riêng khỏi mạng nên **dễ unit test** (`badgeLogic.test.ts`).

### 5.3. `badgeService.ts`

**`loadBadgeStats(userId)`** — gom thống kê từ nhiều bảng bằng `Promise.all`:

| Thống kê | Nguồn |
|---|---|
| `onboardingComplete` | `profiles.onboarding_completed` |
| `workoutSessions` | `count` của `workout_sessions` |
| `currentStreak` | `user_streaks.current_streak` |
| `waterGoalDays` | số ngày `daily_water_intake.water_ml ≥ goal` |
| `nutritionGoalDays` | số ngày `daily_nutrition.calories_consumed ≥ goal` |
| `maxCaloriesBurnedDay` | ngày đốt calo cao nhất (gom theo `workout_date`) |

**`getBadgesWithStatus(userId)`** — trả danh sách badge kèm `earned`. Nếu bảng `badges` trống/lỗi → dùng `FALLBACK_BADGES` (catalog offline) và tính `earned` client-side qua `isBadgeEarned`.

**`syncUserBadges(userId)`** — cơ chế cấp huy hiệu:

```typescript
const earnedIds = new Set((earned ?? []).map(r => r.badge_id));
const toAward = badges.filter(b => !earnedIds.has(b.id) && isBadgeEarned(b, stats));

if (toAward.length > 0) {
  const { error } = await supabase.from('user_badges').insert(
    toAward.map(b => ({ user_id: userId, badge_id: b.id })),
  );
  if (error && error.code !== '23505') {       // bỏ qua lỗi trùng (đã đạt)
    console.warn('syncUserBadges insert error:', error.message);
  }
}
return getBadgesWithStatus(userId);
```

Gọi mỗi lần mở Dashboard → huy hiệu được cấp tự động ngay khi đủ điều kiện.

### 5.4. `BadgeGrid.tsx`

Lưới hiển thị tất cả huy hiệu; badge đã đạt được tô sáng (icon + màu nổi bật), badge chưa đạt mờ đi. Dùng `icon` (tên `MaterialIcons`) lưu trong DB.

---

## 6. Module Notification (Thông báo)

### 6.1. Type & nguyên tắc an toàn Expo Go

```typescript
export type NotificationPreferences = {
  water_reminder_enabled: boolean;
  workout_reminder_enabled: boolean;
  badge_notifications_enabled: boolean;
  wakeup_time: string;       // 'HH:MM'
};
```

`expo-notifications` **không chạy trên Expo Go**. Cả `notificationService` và `waterReminderService` đều:

```typescript
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

async function getNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo) return null;                       // bỏ qua trên Expo Go
  if (notificationsModule === undefined) {
    try {
      notificationsModule = await import('expo-notifications');  // lazy import
      notificationsModule.setNotificationHandler({ /* show alert + sound */ });
    } catch { notificationsModule = null; }
  }
  return notificationsModule;
}
```

→ Mọi hàm gọi `getNotifications()`; nếu `null` thì lặng lẽ bỏ qua, **không crash**.

### 6.2. Ba loại thông báo

| Loại | Service | Lịch | Lưu id |
|---|---|---|---|
| **Nhắc uống nước** | `waterReminderService.ts` | 8 mốc cố định: 7,9,11,13,15,17,19,21h (lặp ngày) | `water_reminder_ids` (AsyncStorage) |
| **Nhắc tập luyện** | `notificationService.ts` | Theo `wakeup_time` của user (lặp ngày) | `workout_reminder_id` (AsyncStorage) |
| **Huy hiệu mới** | `notificationService.notifyBadgeEarned` | Tức thì (`trigger: null`) | — |

### 6.3. `notificationService.ts` — các hàm chính

**`getNotificationPreferences(userId)`** — đọc 4 cờ từ `profiles`.

**`updateNotificationPreferences(userId, prefs)`** — bật/tắt từng loại:

```
prefs.water_reminder_enabled === true  → enableWaterReminders()  (xin quyền + lập lịch 8 mốc)
prefs.water_reminder_enabled === false → disableWaterReminders() (hủy lịch)

prefs.workout_reminder_enabled === true →
   requestPermissions() → (Android) tạo channel 'workout-reminders'
   → scheduleWorkoutReminder(wakeup_time)
prefs.workout_reminder_enabled === false → cancelWorkoutReminder()

đổi wakeup_time khi nhắc tập đang bật → đặt lại lịch
```

Cuối cùng ghi 4 cờ ngược lên `profiles`. Trên Expo Go, bật nhắc nhở sẽ ném lỗi hướng dẫn dùng *development build*.

**`scheduleWorkoutReminder(wakeupTime)`** — hủy lịch cũ, parse `HH:MM`, lập lịch `CALENDAR` lặp hằng ngày, lưu id.

**`syncAllRemindersOnLaunch(userId)`** — gọi từ `App.tsx` sau khi xác nhận đã onboarding: đồng bộ nhắc nước + (nếu bật) đặt lại nhắc tập. Bỏ qua hoàn toàn nếu Expo Go.

**`notifyBadgeEarned(title, body)`** — bắn thông báo tức thì khi mở khóa huy hiệu (chỉ khi `badge_notifications_enabled`).

### 6.4. `NotificationSettingsModal.tsx`

Giao diện bật/tắt: nhắc uống nước, nhắc tập luyện (kèm chọn giờ), thông báo huy hiệu. Gọi `updateNotificationPreferences`, hiển thị lỗi (vd thiếu quyền, Expo Go) qua Alert. Mở từ `AppMenuDrawer` (menu "3 gạch") hoặc từ `ProfileScreen`.

---

## 7. Luồng hoạt động end-to-end

### 7.1. Mở app → hiển thị Dashboard

```
App.tsx xác nhận đã đăng nhập + đã onboarding
   → syncAllRemindersOnLaunch(userId)        // đặt lại nhắc nhở nếu user đã bật
   → render DashboardScreen (tab Home mặc định)
       → loadDashboard():
           Promise.all([
             getDashboardSummary  → RPC get_dashboard_summary() → JSON
                                    → normalizeWeeklyWorkouts (đủ 7 ngày)
             syncUserBadges       → cấp badge mới nếu đủ điều kiện
             getNotificationPreferences
           ])
           → nếu có badge mới & bật thông báo → notifyBadgeEarned
       → render StatsGrid + WeeklyProgressChart + WorkoutCard + BadgeGrid
```

### 7.2. Hoàn thành buổi tập → Dashboard cập nhật

```
WorkoutDetailScreen hoàn thành → onCompleted()
   → App.tsx tăng dashboardRefreshKey
   → DashboardScreen tải lại:
        • streak & calo hôm nay tăng (qua RPC)
        • biểu đồ 7 ngày thêm cột hôm nay
        • syncUserBadges có thể cấp 'first_workout' / 'streak_3' / 'burn_500'…
        • nếu badge mới → thông báo đẩy
```

### 7.3. Bật nhắc nhở

```
AppMenuDrawer → NotificationSettingsModal → bật "Nhắc tập luyện"
   → updateNotificationPreferences({ workout_reminder_enabled: true })
   → xin quyền OS → (Android) tạo channel → scheduleWorkoutReminder(wakeup_time)
   → ghi cờ vào profiles
   → mỗi ngày đúng giờ: thông báo "Giờ tập luyện 💪"
```

---

## 8. Kế hoạch & checklist kiểm thử

Theo nguyên tắc phân công: **Người 4 test module của mình** (notification, quyền thông báo, badge/stats) và **test chéo CMS/Admin của Người 5**.

### 8.1. Unit test (`badgeLogic.test.ts`)

```bash
npm run test:badges          # chạy logic huy hiệu
npm test                     # chạy toàn bộ
npm run typecheck            # tsc --noEmit
```

Bao phủ `isBadgeEarned` cho từng `criteria_type`: đạt/chưa đạt đúng ngưỡng.

### 8.2. Checklist test thủ công

**Dashboard / stats:**
- [ ] User mới (0 buổi tập): biểu đồ hiển thị empty state, không cột mờ vô nghĩa.
- [ ] Có buổi tập: cột đúng ngày, highlight hôm nay, tổng calo/buổi tập khớp.
- [ ] Snapshot luôn đủ 7 ngày kể cả khi có ngày không tập.
- [ ] RPC lỗi → fallback client vẫn hiển thị đúng số liệu.
- [ ] Pull-to-refresh & refresh sau khi hoàn thành buổi tập.

**Badges:**
- [ ] Đủ điều kiện (vd buổi tập đầu, streak 3) → badge tự cấp, tô sáng.
- [ ] Không cấp trùng (chạy `syncUserBadges` nhiều lần — bỏ qua lỗi `23505`).
- [ ] Bảng `badges` trống → dùng FALLBACK_BADGES, app không vỡ.

**Notification & quyền:**
- [ ] Expo Go: bật nhắc → báo lỗi hướng dẫn dùng dev build, **không crash**.
- [ ] Dev build: bật/tắt nhắc nước (8 mốc), nhắc tập (theo giờ); hủy đúng.
- [ ] Từ chối quyền OS → báo lỗi rõ ràng, không bật cờ.
- [ ] Đổi `wakeup_time` khi nhắc tập đang bật → lịch đặt lại.
- [ ] Mở khóa badge khi bật thông báo → có thông báo đẩy; khi tắt → không có.
- [ ] Mở lại app → `syncAllRemindersOnLaunch` khôi phục đúng lịch theo cờ DB.

**Trạng thái rỗng / mạng yếu:**
- [ ] Mất mạng: Dashboard fallback, badge dùng catalog, không trắng màn hình.

---

## 9. Vận hành & lưu ý

### 9.1. Chạy migration của module

Migration `20260627200000_dashboard_badges_notifications.sql` **phụ thuộc** các bảng `profiles`, `workout_sessions`, `user_streaks`, `daily_water_intake`, `daily_nutrition` (do migration `…173357_workout_onboarding…` tạo). Vì vậy thứ tự chạy bắt buộc:

| # | File | Ghi chú |
|---|---|---|
| 1 | `…000000_nutrition_water_health.sql` | nutrition/water/foods |
| 2 | `…173357_workout_onboarding_atomic_updates.sql` | **bắt buộc trước** module này |
| 3 | **`…200000_dashboard_badges_notifications.sql`** | ← module Người 4 |
| 4 | `…100000_add_new_programs_v2.sql` | seed chương trình |

### 9.2. Lưu ý quan trọng

- **Thông báo** chỉ hoạt động trên *development build* / bản release, **không** trên Expo Go.
- **Ngày tháng:** dùng `dateUtils.toLocalDateString()` / `normalizeDateString()` theo timezone thiết bị, tránh lệch ngày do UTC khi so khớp biểu đồ 7 ngày.
- **Idempotent:** seed badge dùng `ON CONFLICT (code) DO UPDATE`, cấp badge bỏ qua lỗi trùng → chạy lại an toàn.
- **Bảo mật:** RPC `get_dashboard_summary` dùng `SECURITY INVOKER` + `search_path=''`, raise `42501` nếu chưa đăng nhập; RLS đảm bảo mỗi user chỉ thấy dữ liệu của mình.

---

*Tài liệu chỉ bao phủ module Dashboard / Notification / Badges (Người 4). Khi đổi schema badge, RPC dashboard hoặc logic nhắc nhở, hãy cập nhật mục tương ứng.*
