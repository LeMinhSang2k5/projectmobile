import { supabase } from '../../utils/supabase';
import { Program, Exercise } from '../types';

const MOCK_PROGRAMS: Program[] = [
  {
    id: 'mock-p1',
    title: 'Elite Fitness Ignite (Offline)',
    description: 'Chương trình mẫu dành cho chế độ Offline',
    level: 'Beginner',
    thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
    created_at: new Date().toISOString(),
  },
];

export const fetchPrograms = async (): Promise<Program[]> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 10000)
  );

  try {
    const { data, error } = await Promise.race([
      supabase.from('programs').select('*').order('created_at', { ascending: false }),
      timeout,
    ]) as { data: Program[] | null; error: Error | null };

    if (error) throw error;
    if (!data || data.length === 0) return MOCK_PROGRAMS;
    return data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log('Sử dụng dữ liệu mẫu do lỗi:', message);
    return MOCK_PROGRAMS;
  }
};

export const fetchExercisesByProgram = async (programId: string): Promise<Exercise[]> => {
  if (programId === 'mock-p1') {
    return [
      {
        id: 'mock-e1',
        program_id: 'mock-p1',
        name: 'Jumping Jacks (Dữ liệu mẫu)',
        duration: 30,
        met_value: 8.0,
        media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif',
        created_at: new Date().toISOString(),
      },
    ];
  }

  const { data } = await supabase.from('exercises').select('*').eq('program_id', programId);
  return (data as Exercise[]) || [];
};

export const calculateCalories = (met: number, weightKg: number, durationSeconds: number): number => {
  return Math.round((met * 3.5 * weightKg / 200) * (durationSeconds / 60) * 100) / 100;
};

const todayString = () => new Date().toISOString().split('T')[0];

const yesterdayString = () =>
  new Date(Date.now() - 86400000).toISOString().split('T')[0];

export const updateUserStreak = async (userId: string): Promise<number> => {
  const today = todayString();
  const yesterday = yesterdayString();

  const { data: existing } = await supabase
    .from('user_streaks')
    .select('current_streak, last_workout_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      last_workout_date: today,
    });
    return 1;
  }

  if (existing.last_workout_date === today) {
    return existing.current_streak;
  }

  const newStreak =
    existing.last_workout_date === yesterday ? existing.current_streak + 1 : 1;

  await supabase
    .from('user_streaks')
    .update({
      current_streak: newStreak,
      last_workout_date: today,
    })
    .eq('user_id', userId);

  return newStreak;
};

export const logExercise = async (userId: string, exerciseId: string, calories: number) => {
  await supabase.from('exercise_logs').insert({
    user_id: userId,
    exercise_id: exerciseId,
    workout_date: todayString(),
    calories_burned: calories,
  });

  return updateUserStreak(userId);
};
