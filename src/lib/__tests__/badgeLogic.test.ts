import assert from 'node:assert/strict';
import { isBadgeEarned } from '../badgeCalculations';
import type { Badge } from '../../types';

const streakBadge: Badge = {
  id: '1',
  code: 'streak_3',
  title: 'Kiên trì 3 ngày',
  description: 'Test',
  icon: 'whatshot',
  criteria_type: 'streak',
  criteria_value: 3,
  sort_order: 1,
};

assert.equal(
  isBadgeEarned(streakBadge, {
    onboardingComplete: true,
    workoutSessions: 2,
    currentStreak: 3,
    waterGoalDays: 0,
    nutritionGoalDays: 0,
    maxCaloriesBurnedDay: 0,
  }),
  true,
);

assert.equal(
  isBadgeEarned(streakBadge, {
    onboardingComplete: true,
    workoutSessions: 2,
    currentStreak: 2,
    waterGoalDays: 0,
    nutritionGoalDays: 0,
    maxCaloriesBurnedDay: 0,
  }),
  false,
);

console.log('badgeLogic tests passed');
