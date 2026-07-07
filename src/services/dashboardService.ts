/**
 * Service Dashboard — Tầng 2 (nghiệp vụ).
 * Lấy số liệu tổng quan tab Home: streak, calo, buổi tập, biểu đồ 7 ngày, cờ nhắc nhở.
 * Ưu tiên RPC `get_dashboard_summary()`; nếu lỗi thì fallback đọc từng bảng trên client.
 */
import { supabase } from '../../utils/supabase';
import { getProfile } from './healthService';
import { getDailyNutrition } from './nutritionService';
import { getTodayWater } from './waterService';
import { localDateDaysAgo, normalizeDateString, toLocalDateString } from '../lib/dateUtils';
import { buildEmptyWeekly, normalizeWeeklyWorkouts } from '../lib/weeklyWorkoutUtils';
import type { DashboardSummary, WeeklyWorkoutDay } from '../types';

export { normalizeWeeklyWorkouts };

/**
 * Fallback client khi RPC `get_dashboard_summary` lỗi hoặc chưa có migration.
 * Gom song song 3 nguồn: profiles, user_streaks, workout_sessions (7 ngày gần nhất).
 * userId chỉ dùng ở đây — RPC tự lấy user từ JWT qua auth.uid().
 */
async function buildDashboardSummaryClient(userId: string): Promise<DashboardSummary> {
  const today = toLocalDateString();
  const weekStart = localDateDaysAgo(6);

  const [profile, streakResult, sessionsResult] = await Promise.all([
    getProfile(userId),
    supabase
      .from('user_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('workout_sessions')
      .select('workout_date, total_calories')
      .eq('user_id', userId)
      .gte('workout_date', weekStart)
      .lte('workout_date', today),
  ]);

  const weeklyMap = new Map<string, WeeklyWorkoutDay>();
  for (const day of buildEmptyWeekly()) {
    weeklyMap.set(day.date, { ...day });
  }

  for (const session of sessionsResult.data ?? []) {
    const date = normalizeDateString(session.workout_date);
    const existing = weeklyMap.get(date);
    if (!existing) continue;
    existing.workouts += 1;
    existing.calories_burned += Number(session.total_calories ?? 0);
  }

  const todaySessions = (sessionsResult.data ?? []).filter((row) => row.workout_date === today);

  return {
    display_name: profile?.display_name ?? null,
    current_streak: streakResult.data?.current_streak ?? 0,
    longest_streak: streakResult.data?.longest_streak ?? 0,
    calories_burned_today: todaySessions.reduce(
      (sum, row) => sum + Number(row.total_calories ?? 0),
      0,
    ),
    workouts_today: todaySessions.length,
    weekly_workouts: Array.from(weeklyMap.values()),
    wakeup_time: profile?.wakeup_time ?? '06:30',
    water_reminder_enabled: profile?.water_reminder_enabled ?? false,
    workout_reminder_enabled: profile?.workout_reminder_enabled ?? false,
    badge_notifications_enabled: profile?.badge_notifications_enabled ?? true,
  };
}

/**
 * Lấy toàn bộ số liệu Dashboard trong một lần gọi.
 * Sau RPC, chuẩn hóa weekly_workouts để biểu đồ luôn có đủ 7 ngày theo timezone thiết bị.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('get_dashboard_summary');
  if (!error && data) {
    const summary = data as DashboardSummary;
    return {
      ...summary,
      weekly_workouts: normalizeWeeklyWorkouts(summary.weekly_workouts),
    };
  }

  return buildDashboardSummaryClient(userId);
}

/** Snapshot dinh dưỡng + nước hôm nay (dùng cho StatsGrid / thẻ sức khỏe). */
export async function getTodayNutritionSnapshot(userId: string) {
  const today = toLocalDateString();
  const profile = await getProfile(userId);
  const [nutrition, water] = await Promise.all([
    getDailyNutrition(userId, today),
    getTodayWater(userId, profile, today),
  ]);
  return { profile, nutrition, water, today };
}
