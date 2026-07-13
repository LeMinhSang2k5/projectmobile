// Các kiểu dữ liệu cho toàn app

import type { ActivityLevel, Gender } from '../lib/healthCalculations';

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  daily_calorie_goal: number;
  wakeup_time: string;
  created_at: string;
  age: number | null;
  fitness_goal: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  gender: Gender | null;
  activity_level: ActivityLevel | null;
  bmi: number | null;
  bmr: number | null;
  tdee: number | null;
  protein_goal_g: number | null;
  carbs_goal_g: number | null;
  fat_goal_g: number | null;
  water_goal_ml: number | null;
  water_reminder_enabled: boolean | null;
  workout_reminder_enabled: boolean | null;
  badge_notifications_enabled: boolean | null;
  onboarding_completed: boolean;
  role?: 'user' | 'admin';
  updated_at?: string;
};

export type Program = {
  id: string;
  title: string;
  description: string | null;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail_url: string | null;
  created_at: string;
};

export type Exercise = {
  id: string;
  program_id: string;
  name: string;
  duration: number;
  met_value: number;
  media_url: string | null;
  sort_order?: number;
  created_at: string;
};

export type ExerciseLog = {
  id: string;
  user_id: string;
  exercise_id: string;
  workout_date: string;
  calories_burned: number;
  created_at: string;
};

export type UserStreak = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  updated_at: string;
};

export type WorkoutCourse = {
  id: string;
  title: string;
  total_sessions: number;
  target_muscle: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string | null;
};

export type UserCourse = {
  id: string;
  user_id: string;
  course_id: string;
  completed_sessions: number;
  is_active: boolean;
  started_at: string;
  workout_courses?: WorkoutCourse;
};

export type DailyWaterIntake = {
  id: string;
  user_id: string;
  date: string;
  water_cups: number;
  water_goal: number;
  water_ml: number;
  water_goal_ml: number;
};

export type DailyNutrition = {
  id: string;
  user_id: string;
  date: string;
  calories_consumed: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Food = {
  id: string;
  name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  is_custom: boolean;
  created_by: string | null;
};

export type MealLog = {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
};

export type MealItem = {
  id: string;
  meal_log_id: string;
  food_id: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  foods?: Food;
};

export type MealLogWithItems = MealLog & {
  meal_items: MealItem[];
};

export type SuggestedMealItem = {
  food: Food;
  quantity: number;
  estimatedCalories: number;
};

export type SuggestedMeals = Record<'breakfast' | 'lunch' | 'dinner', SuggestedMealItem[]>;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
  snack: 'Ăn vặt',
};

export const DEFAULT_CALORIE_GOAL = 2100;
export const DEFAULT_WATER_GOAL_ML = 2000;

export type Badge = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  sort_order: number;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badges?: Badge;
};

export type BadgeWithStatus = Badge & {
  earned: boolean;
  earned_at: string | null;
};

export type WeeklyWorkoutDay = {
  date: string;
  workouts: number;
  calories_burned: number;
};

export type DashboardSummary = {
  display_name: string | null;
  current_streak: number;
  longest_streak: number;
  calories_burned_today: number;
  workouts_today: number;
  weekly_workouts: WeeklyWorkoutDay[];
  wakeup_time: string;
  water_reminder_enabled: boolean;
  workout_reminder_enabled: boolean;
  badge_notifications_enabled: boolean;
};

/** Dữ liệu thẻ buổi tập trên Dashboard — từ khóa tập active hoặc chương trình gần nhất. */
export type WorkoutCardSummary = {
  title: string;
  subtitle: string;
  progressPercent: number | null;
  sessionsCompleted: number;
  totalSessions: number | null;
  remainingLabel: string | null;
  thumbnailUrl: string | null;
};

export type NotificationPreferences = {
  water_reminder_enabled: boolean;
  workout_reminder_enabled: boolean;
  badge_notifications_enabled: boolean;
  wakeup_time: string;
};
