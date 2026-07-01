import { supabase } from '../../utils/supabase';
import { getWaterGoalMl } from './healthService';
import type { DailyWaterIntake, Profile } from '../types';
import { toLocalDateString } from '../lib/dateUtils';

const today = () => toLocalDateString();

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
  if (!userId) throw new Error('Bạn cần đăng nhập để cập nhật nước');
  if (ml <= 0) throw new Error('Lượng nước phải lớn hơn 0');

  const goalMl = getWaterGoalMl(profile);
  const { data, error } = await supabase.rpc('add_water_intake', {
    p_amount_ml: ml,
    p_date: date,
    p_goal_ml: goalMl,
  });
  if (error) throw error;
  return data as DailyWaterIntake;
}

export async function setWaterMl(
  userId: string,
  ml: number,
  profile: Profile | null,
  date: string = today(),
): Promise<DailyWaterIntake> {
  if (!userId) throw new Error('Bạn cần đăng nhập để cập nhật nước');

  const goalMl = getWaterGoalMl(profile);
  const safeMl = Math.max(0, Math.round(ml));

  const { data, error } = await supabase
    .from('daily_water_intake')
    .upsert(
      {
        user_id: userId,
        date,
        water_ml: safeMl,
        water_goal_ml: goalMl,
        water_cups: Math.floor(safeMl / 250),
        water_goal: Math.ceil(goalMl / 250),
      },
      { onConflict: 'user_id,date' },
    )
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
  if (!userId) throw new Error('Bạn cần đăng nhập để cập nhật mục tiêu nước');
  if (goalMl <= 0) throw new Error('Mục tiêu nước phải lớn hơn 0');
  const { error } = await supabase.rpc('set_daily_water_goal', {
    p_goal_ml: goalMl,
    p_date: date,
  });
  if (error) throw error;
}
