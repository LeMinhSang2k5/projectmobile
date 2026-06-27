import { supabase } from '../../utils/supabase';
import { Program, Exercise } from '../types';
import { toLocalDateString } from './dateUtils';
import { calculateCalories } from './workoutCalculations';

export { calculateCalories } from './workoutCalculations';

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

  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as Exercise[]) || [];
};

export const logExercise = async (userId: string, exerciseId: string, calories: number) => {
  if (exerciseId.startsWith('mock-')) return;

  const { error } = await supabase.from('exercise_logs').insert({
    user_id: userId,
    exercise_id: exerciseId,
    workout_date: toLocalDateString(),
    calories_burned: calories,
  });
  if (error) throw error;
};

export const completeWorkoutSession = async (
  programId: string,
  totalCalories: number,
): Promise<number | null> => {
  if (programId.startsWith('mock-')) return null;

  const { data, error } = await supabase.rpc('complete_workout_session', {
    p_program_id: programId,
    p_workout_date: toLocalDateString(),
    p_total_calories: totalCalories,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : Number(data ?? 0);
};
