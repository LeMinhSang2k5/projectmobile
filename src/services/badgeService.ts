import { supabase } from '../../utils/supabase';
import { getProfile, getCalorieGoal, getWaterGoalMl } from './healthService';
import { getDailyNutrition } from './nutritionService';
import { getTodayWater } from './waterService';
import { toLocalDateString } from '../lib/dateUtils';
import { FALLBACK_BADGES } from '../lib/badgeCatalog';
import { isBadgeEarned } from '../lib/badgeCalculations';
import type { Badge, BadgeWithStatus } from '../types';

type BadgeStats = {
  onboardingComplete: boolean;
  workoutSessions: number;
  currentStreak: number;
  waterGoalDays: number;
  nutritionGoalDays: number;
  maxCaloriesBurnedDay: number;
};

async function loadBadgeStats(userId: string): Promise<BadgeStats> {
  const today = toLocalDateString();
  const profile = await getProfile(userId);
  const calorieGoal = getCalorieGoal(profile);
  const waterGoalMl = getWaterGoalMl(profile);

  const [
    streakResult,
    workoutCountResult,
    waterRows,
    nutritionRows,
    burnRows,
  ] = await Promise.all([
    supabase.from('user_streaks').select('current_streak').eq('user_id', userId).maybeSingle(),
    supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('daily_water_intake').select('date, water_ml, water_goal_ml').eq('user_id', userId),
    supabase.from('daily_nutrition').select('date, calories_consumed').eq('user_id', userId),
    supabase
      .from('workout_sessions')
      .select('workout_date, total_calories')
      .eq('user_id', userId),
  ]);

  const [todayNutrition, todayWater] = await Promise.all([
    getDailyNutrition(userId, today),
    getTodayWater(userId, profile, today),
  ]);

  const todayWaterGoal = todayWater?.water_goal_ml ?? waterGoalMl;
  const todayWaterMet = (todayWater?.water_ml ?? 0) >= todayWaterGoal && todayWaterGoal > 0;
  const todayNutritionMet =
    (todayNutrition?.calories_consumed ?? 0) >= calorieGoal && calorieGoal > 0;

  const waterGoalDays =
    (waterRows.data ?? []).filter((row) => {
      if (row.date === today) return false;
      const goal = row.water_goal_ml ?? waterGoalMl;
      return row.water_ml >= goal && goal > 0;
    }).length + (todayWaterMet ? 1 : 0);

  const nutritionGoalDays =
    (nutritionRows.data ?? []).filter(
      (row) => row.date !== today && row.calories_consumed >= calorieGoal && calorieGoal > 0,
    ).length + (todayNutritionMet ? 1 : 0);

  const burnByDay = new Map<string, number>();
  for (const row of burnRows.data ?? []) {
    const current = burnByDay.get(row.workout_date) ?? 0;
    burnByDay.set(row.workout_date, current + Number(row.total_calories ?? 0));
  }
  const maxCaloriesBurnedDay = Math.max(0, ...Array.from(burnByDay.values()));

  return {
    onboardingComplete: profile?.onboarding_completed === true,
    workoutSessions: workoutCountResult.count ?? 0,
    currentStreak: streakResult.data?.current_streak ?? 0,
    waterGoalDays,
    nutritionGoalDays,
    maxCaloriesBurnedDay: Math.max(
      maxCaloriesBurnedDay,
      burnByDay.get(today) ?? 0,
    ),
  };
}

export async function getBadgesWithStatus(userId: string): Promise<BadgeWithStatus[]> {
  const [{ data: badges, error: badgesError }, { data: earned }] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('user_badges')
      .select('badge_id, earned_at')
      .eq('user_id', userId),
  ]);

  const catalog = badgesError || !badges?.length ? FALLBACK_BADGES : (badges as Badge[]);

  if (badgesError || !badges?.length) {
    const stats = await loadBadgeStats(userId);
    return catalog.map((badge) => ({
      ...badge,
      earned: isBadgeEarned(badge, stats),
      earned_at: null,
    }));
  }

  const earnedMap = new Map(
    (earned ?? []).map((row) => [row.badge_id, row.earned_at as string]),
  );

  return catalog.map((badge) => ({
    ...badge,
    earned: earnedMap.has(badge.id),
    earned_at: earnedMap.get(badge.id) ?? null,
  }));
}

export async function syncUserBadges(userId: string): Promise<BadgeWithStatus[]> {
  const [{ data: badges, error: badgesError }, stats, { data: earned }] = await Promise.all([
    supabase.from('badges').select('*').order('sort_order', { ascending: true }),
    loadBadgeStats(userId),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
  ]);

  if (badgesError || !badges?.length) {
    return getBadgesWithStatus(userId);
  }

  const earnedIds = new Set((earned ?? []).map((row) => row.badge_id));
  const toAward = (badges as Badge[]).filter(
    (badge) => !earnedIds.has(badge.id) && isBadgeEarned(badge, stats),
  );

  if (toAward.length > 0) {
    const { error } = await supabase.from('user_badges').insert(
      toAward.map((badge) => ({
        user_id: userId,
        badge_id: badge.id,
      })),
    );
    if (error && error.code !== '23505') {
      console.warn('syncUserBadges insert error:', error.message);
    }
  }

  return getBadgesWithStatus(userId);
}
