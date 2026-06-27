import { supabase } from '../../utils/supabase';
import { getWaterGoalMl } from './healthService';
import type { DailyWaterIntake, Profile } from '../types';

const today = () => new Date().toISOString().split('T')[0];

export async function getTodayWater(
  userId: string,
  profile: Profile | null,
  date: string = today(),
): Promise<DailyWaterIntake | null> {
  const { data, error } = await supabase
    .from('daily_water_intake')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data as DailyWaterIntake | null;
}

export async function addWater(
  userId: string,
  ml: number,
  profile: Profile | null,
  date: string = today(),
): Promise<DailyWaterIntake> {
  if (ml <= 0) throw new Error('Lượng nước phải lớn hơn 0');

  const goalMl = getWaterGoalMl(profile);
  const existing = await getTodayWater(userId, profile, date);
  const newMl = (existing?.water_ml ?? 0) + ml;

  if (!existing) {
    const { data, error } = await supabase
      .from('daily_water_intake')
      .insert({
        user_id: userId,
        date,
        water_ml: newMl,
        water_goal_ml: goalMl,
        water_cups: Math.floor(newMl / 250),
        water_goal: Math.ceil(goalMl / 250),
      })
      .select()
      .single();
    if (error) throw error;
    return data as DailyWaterIntake;
  }

  const { data, error } = await supabase
    .from('daily_water_intake')
    .update({
      water_ml: newMl,
      water_goal_ml: goalMl,
      water_cups: Math.floor(newMl / 250),
      water_goal: Math.ceil(goalMl / 250),
    })
    .eq('id', existing.id)
    .select()
    .single();
  if (error) throw error;
  return data as DailyWaterIntake;
}

export async function setWaterGoal(
  userId: string,
  goalMl: number,
  date: string = today(),
): Promise<void> {
  const existing = await getTodayWater(userId, null, date);
  if (existing) {
    await supabase
      .from('daily_water_intake')
      .update({
        water_goal_ml: goalMl,
        water_goal: Math.ceil(goalMl / 250),
      })
      .eq('id', existing.id);
  }
}
