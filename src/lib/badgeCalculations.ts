import type { Badge } from '../types';

type BadgeStats = {
  onboardingComplete: boolean;
  workoutSessions: number;
  currentStreak: number;
  waterGoalDays: number;
  nutritionGoalDays: number;
  maxCaloriesBurnedDay: number;
};

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
