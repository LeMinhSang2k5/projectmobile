import { supabase } from '../../utils/supabase';
import { Program, Exercise } from '../types';
import { toLocalDateString } from './dateUtils';
import { calculateCalories } from './workoutCalculations';

export { calculateCalories } from './workoutCalculations';

const MOCK_PROGRAMS: Program[] = [
  {
    id: 'mock-p1',
    title: 'Elite Fitness Ignite',
    description: 'Chương trình khởi động cơ bản.',
    level: 'Beginner',
    thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-p2',
    title: 'Sức Mạnh Toàn Thân',
    description: 'Tăng cường sức mạnh cơ bắp.',
    level: 'Intermediate',
    thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-p3',
    title: 'Yoga & Linh Hoạt',
    description: 'Dẻo dai và cân bằng tâm trí.',
    level: 'Beginner',
    thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-p4',
    title: 'HIIT Đốt Mỡ Siêu Tốc',
    description: 'Đốt cháy calo ở cường độ cao.',
    level: 'Advanced',
    thumbnail_url: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712',
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-p5',
    title: 'Cardio Tim Mạch',
    description: 'Cải thiện sức bền hệ tim mạch.',
    level: 'Intermediate',
    thumbnail_url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c',
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
    console.log('Sử dụng 5 chương trình mẫu do lỗi:', message);
    return MOCK_PROGRAMS;
  }
};

export const fetchExercisesByProgram = async (programId: string): Promise<Exercise[]> => {
  if (programId.startsWith('mock-') || programId.length < 5) {
    const mockExercises: Record<string, Exercise[]> = {
      'mock-p1': [
        { id: 'm1-1', program_id: programId, name: 'Jumping Jacks', duration: 30, met_value: 8.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() },
      ],
      'mock-p2': [
        { id: 'm2-1', program_id: programId, name: 'Pushups', duration: 45, met_value: 8.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() },
      ],
      'mock-p3': [
        { id: 'm3-1', program_id: programId, name: 'Plank', duration: 60, met_value: 3.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() },
      ],
      'mock-p4': [
        { id: 'm4-1', program_id: programId, name: 'Burpees', duration: 30, met_value: 12.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() },
      ],
      'mock-p5': [
        { id: 'm5-1', program_id: programId, name: 'Chạy tại chỗ', duration: 60, met_value: 7.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() },
      ],
    };
    return mockExercises[programId] || mockExercises['mock-p1'];
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
  if (exerciseId.startsWith('mock-') || exerciseId.startsWith('m')) return;

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

export const getWorkoutHistory = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('workout_date')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false });
  
  if (error) return [];
  return Array.from(new Set(data.map((item: any) => item.workout_date)));
};

export const getUserStreak = async (userId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error || !data) return 0;
  return data.current_streak;
};
