import { supabase } from '../../utils/supabase';
import {
  calculateHealthMetrics,
  hasCompleteHealthProfile,
  type ActivityLevel,
  type FitnessGoal,
  type Gender,
} from '../lib/healthCalculations';
import type { Profile } from '../types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function recalculateAndSave(userId: string): Promise<Profile | null> {
  const profile = await getProfile(userId);
  if (!profile || !hasCompleteHealthProfile(profile)) return profile;

  const metrics = calculateHealthMetrics({
    weight_kg: profile.weight_kg!,
    height_cm: profile.height_cm!,
    age: profile.age!,
    gender: profile.gender as Gender,
    activity_level: profile.activity_level as ActivityLevel,
    fitness_goal: (profile.fitness_goal as FitnessGoal) ?? 'maintain',
  });

  const { data, error } = await supabase
    .from('profiles')
    .update({
      bmi: metrics.bmi,
      bmr: metrics.bmr,
      tdee: metrics.tdee,
      daily_calorie_goal: metrics.daily_calorie_goal,
      protein_goal_g: metrics.macro_targets.protein_g,
      carbs_goal_g: metrics.macro_targets.carbs_g,
      fat_goal_g: metrics.macro_targets.fat_g,
      water_goal_ml: metrics.water_goal_ml,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export function getCalorieGoal(profile: Profile | null): number {
  return profile?.daily_calorie_goal ?? 2100;
}

export function getMacroGoals(profile: Profile | null) {
  return {
    protein_g: profile?.protein_goal_g ?? 158,
    carbs_g: profile?.carbs_goal_g ?? 236,
    fat_g: profile?.fat_goal_g ?? 58,
  };
}

export function getWaterGoalMl(profile: Profile | null): number {
  if (profile?.water_goal_ml) return profile.water_goal_ml;
  if (profile?.weight_kg) return Math.round(profile.weight_kg * 35);
  return 2000;
}
