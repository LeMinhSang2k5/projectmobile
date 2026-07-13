/**
 * Service Dashboard — Tang 2 (nghiep vu).
 * Lay so lieu tong quan tab Home: streak, calo, buoi tap, bieu do 7 ngay, co nho nho.
 * Uu tien RPC `get_dashboard_summary()`; neu loi thi fallback doc tung bang tren client.
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
 * Fallback client khi RPC `get_dashboard_summary` loi hoac chua co migration.
 * Gom song song 3 nguon: profiles, user_streaks, workout_sessions (7 ngay gan nhat).
 * userId chi dung o day — RPC tu lay user tu JWT qua auth.uid().
 */
async function buildDashboardSummaryClient(userId: string): Promise<DashboardSummary> {
  const today = toLocalDateString();
  const weekStart = localDateDaysAgo(6); // 7 ngay: hom nay + 6 ngay truoc

  // 3 query song song: profile, streak, buoi tap trong tuan
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

  // Khoi tao map 7 ngay rong (workouts=0, calories_burned=0) de bieu do luon du cot
  const weeklyMap = new Map<string, WeeklyWorkoutDay>();
  for (const day of buildEmptyWeekly()) {
    weeklyMap.set(day.date, { ...day });
  }

  // Cong don so buoi tap va calo dot vao tung ngay trong map
  for (const session of sessionsResult.data ?? []) {
    const date = normalizeDateString(session.workout_date);
    const existing = weeklyMap.get(date);
    if (!existing) continue;
    existing.workouts += 1;
    existing.calories_burned += Number(session.total_calories ?? 0);
  }

  // Loc buoi tap hom nay de tinh tong calo dot + so buoi tap trong ngay
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
    // Co nho nho doc tu profile — NotificationSettingsModal dung de hien trang thai
    wakeup_time: profile?.wakeup_time ?? '06:30',
    water_reminder_enabled: profile?.water_reminder_enabled ?? false,
    workout_reminder_enabled: profile?.workout_reminder_enabled ?? false,
    badge_notifications_enabled: profile?.badge_notifications_enabled ?? true,
  };
}

/**
 * Lay toan bo so lieu Dashboard trong mot lan goi.
 * Duong chinh: RPC `get_dashboard_summary` (server gom tat ca, bao mat qua auth.uid()).
 * Duong phu: buildDashboardSummaryClient khi RPC fail.
 * Sau RPC, chuan hoa weekly_workouts de bieu do luon co du 7 ngay theo timezone thiet bi.
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

/**
 * Snapshot dinh duong + nuoc hom nay (dung cho StatsGrid / the suc khoe).
 * Goi song song getDailyNutrition va getTodayWater sau khi lay profile.
 */
export async function getTodayNutritionSnapshot(userId: string) {
  const today = toLocalDateString();
  const profile = await getProfile(userId);
  const [nutrition, water] = await Promise.all([
    getDailyNutrition(userId, today),
    getTodayWater(userId, profile, today),
  ]);
  return { profile, nutrition, water, today };
}
