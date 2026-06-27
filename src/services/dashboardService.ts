import { supabase } from '../../utils/supabase';
import { getProfile } from './healthService';
import { getDailyNutrition } from './nutritionService';
import { getTodayWater } from './waterService';
import { localDateDaysAgo, normalizeDateString, toLocalDateString } from '../lib/dateUtils';
import type { DashboardSummary, WeeklyWorkoutDay } from '../types';

const EMPTY_WEEKLY = (): WeeklyWorkoutDay[] =>
  Array.from({ length: 7 }, (_, index) => ({
    date: localDateDaysAgo(6 - index),
    workouts: 0,
    calories_burned: 0,
  }));

export function normalizeWeeklyWorkouts(raw: unknown): WeeklyWorkoutDay[] {
  const base = EMPTY_WEEKLY();
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
  for (const day of EMPTY_WEEKLY()) {
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

export async function getTodayNutritionSnapshot(userId: string) {
  const today = toLocalDateString();
  const profile = await getProfile(userId);
  const [nutrition, water] = await Promise.all([
    getDailyNutrition(userId, today),
    getTodayWater(userId, profile, today),
  ]);
  return { profile, nutrition, water, today };
}
