/**
 * Tiện ích chuẩn hóa dữ liệu biểu đồ 7 ngày.
 * Server RPC dùng current_date (timezone DB); client tạo khung 7 ngày theo timezone máy.
 */
import { localDateDaysAgo, normalizeDateString } from './dateUtils';
import type { WeeklyWorkoutDay } from '../types';

/** Tạo sẵn 7 ngày (hôm nay − 6 → hôm nay), mỗi ngày workouts = 0, calories_burned = 0. */
export function buildEmptyWeekly(): WeeklyWorkoutDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: localDateDaysAgo(6 - index),
    workouts: 0,
    calories_burned: 0,
  }));
}

/**
 * Đảm bảo biểu đồ luôn nhận đúng 7 ngày, kể cả khi server trả thiếu hoặc date kèm timestamp.
 * Merge dữ liệu RPC vào khung 7 ngày local; ngày ngoài phạm vi bị bỏ qua.
 */
export function normalizeWeeklyWorkouts(raw: unknown): WeeklyWorkoutDay[] {
  const base = buildEmptyWeekly();
  if (!Array.isArray(raw) || raw.length === 0) return base;

  const map = new Map(base.map((day) => [day.date, { ...day }]));
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const date = normalizeDateString(String(row.date ?? ''));
    if (!map.has(date)) continue;
    map.set(date, {
      date,
      workouts: Number(row.workouts ?? 0),
      calories_burned: Number(row.calories_burned ?? 0),
    });
  }

  return base.map((day) => map.get(day.date) ?? day);
}
