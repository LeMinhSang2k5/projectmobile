import type { Badge } from '../types';

/** Các loại tiêu chí hỗ trợ tự động cấp huy hiệu (khớp `badgeCalculations.ts`). */
export const BADGE_CRITERIA_TYPES = [
  'onboarding',
  'workout_sessions',
  'streak',
  'water_goal_days',
  'nutrition_goal_days',
  'calories_burned_day',
] as const;

export type BadgeCriteriaType = (typeof BADGE_CRITERIA_TYPES)[number];

export const BADGE_CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
  onboarding: 'Onboarding',
  workout_sessions: 'Buổi tập',
  streak: 'Chuỗi ngày',
  water_goal_days: 'Ngày đủ nước',
  nutrition_goal_days: 'Ngày đủ calo',
  calories_burned_day: 'Calo đốt/ngày',
};

export const BADGE_CRITERIA_HINTS: Record<BadgeCriteriaType, string> = {
  onboarding: 'Tự động khi user hoàn thành onboarding — để giá trị = 1',
  workout_sessions: 'Số buổi tập tối thiểu (VD: 1 = buổi đầu tiên)',
  streak: 'Số ngày tập liên tiếp tối thiểu (VD: 3, 7, 30)',
  water_goal_days: 'Số ngày đạt mục tiêu uống nước',
  nutrition_goal_days: 'Số ngày đạt mục tiêu calo',
  calories_burned_day: 'Kcal đốt trong một ngày (VD: 500)',
};

/** Icon mặc định + icon từ seed migration. */
export const DEFAULT_BADGE_ICONS = [
  'emoji-events',
  'flag',
  'fitness-center',
  'local-fire-department',
  'whatshot',
  'military-tech',
  'water-drop',
  'restaurant',
  'bolt',
  'star',
  'favorite',
  'directions-run',
  'self-improvement',
  'sports-gymnastics',
] as const;

export function isBadgeCriteriaType(value: string): value is BadgeCriteriaType {
  return (BADGE_CRITERIA_TYPES as readonly string[]).includes(value);
}

export function normalizeBadgeCriteriaType(value: string): BadgeCriteriaType {
  return isBadgeCriteriaType(value) ? value : 'workout_sessions';
}

/** Gom icon đang dùng trong DB + bộ icon gợi ý, bỏ trùng. */
export function getBadgeIconOptions(badges: Badge[]): string[] {
  const fromDb = badges.map((b) => b.icon.trim()).filter(Boolean);
  return [...new Set([...fromDb, ...DEFAULT_BADGE_ICONS])];
}

export function formatBadgeCriteriaLabel(type: string, value: number): string {
  const label = isBadgeCriteriaType(type) ? BADGE_CRITERIA_LABELS[type] : type;
  if (type === 'onboarding') return label;
  return `${label} ≥ ${value}`;
}
