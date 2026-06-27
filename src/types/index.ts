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
