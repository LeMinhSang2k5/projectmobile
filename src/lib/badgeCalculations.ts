/**
 * Logic thuần kiểm tra đủ điều kiện huy hiệu — không gọi mạng, dễ unit test.
 * 8 huy hiệu: onboarding, workout_sessions, streak, water_goal_days,
 * nutrition_goal_days, calories_burned_day.
 * @see docs/pdf/dac_ta_ky_thuat_de_hieu.pdf — mục 4.2–4.3, 10.6
 */
import type { Badge } from '../types';

type BadgeStats = {
  onboardingComplete: boolean;
  workoutSessions: number;
  currentStreak: number;
  waterGoalDays: number;
  nutritionGoalDays: number;
  maxCaloriesBurnedDay: number;
};

/** So sánh stats user với criteria_type + criteria_value của từng badge. */
export function isBadgeEarned(badge: Badge, stats: BadgeStats): boolean {
  switch (badge.criteria_type) {
    case 'onboarding':
      return stats.onboardingComplete;
    case 'workout_sessions':
      return stats.workoutSessions >= badge.criteria_value;
    case 'streak':
      return stats.currentStreak >= badge.criteria_value;
    case 'water_goal_days':
      return stats.waterGoalDays >= badge.criteria_value;
    case 'nutrition_goal_days':
      return stats.nutritionGoalDays >= badge.criteria_value;
    case 'calories_burned_day':
      return stats.maxCaloriesBurnedDay >= badge.criteria_value;
    default:
      return false;
  }
}
