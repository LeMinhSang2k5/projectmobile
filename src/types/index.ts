// Các kiểu dữ liệu cho toàn app

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  daily_calorie_goal: number;
  wakeup_time: string;
  created_at: string;
  age: number | null;
  fitness_goal: string | null;
  date_of_birth: string | null; // 'YYYY-MM-DD'
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
