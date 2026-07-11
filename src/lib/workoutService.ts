import { supabase } from '../../utils/supabase';
import { Program, Exercise } from '../types';
import { toLocalDateString, normalizeDateString } from './dateUtils';
import { calculateCalories } from './workoutCalculations';
import AsyncStorage from '@react-native-async-storage/async-storage';

export { calculateCalories } from './workoutCalculations';

const MOCK_PROGRAMS: Program[] = [
  { id: 'mock-p1', title: 'Elite Fitness Ignite', description: 'Khởi động năng lượng cơ bản.', level: 'Beginner', thumbnail_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438', created_at: new Date().toISOString() },
  { id: 'mock-p2', title: 'Sức Mạnh Toàn Thân', description: 'Phát triển cơ bắp cốt lõi.', level: 'Intermediate', thumbnail_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48', created_at: new Date().toISOString() },
  { id: 'mock-p3', title: 'Yoga & Linh Hoạt', description: 'Cân bằng và dẻo dai.', level: 'Beginner', thumbnail_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b', created_at: new Date().toISOString() },
  { id: 'mock-p4', title: 'HIIT Đốt Mỡ Siêu Tốc', description: 'Cường độ cao, đốt calo tối đa.', level: 'Advanced', thumbnail_url: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712', created_at: new Date().toISOString() },
  { id: 'mock-p5', title: 'Cardio Tim Mạch', description: 'Sức bền và hệ tim mạch khỏe mạnh.', level: 'Intermediate', thumbnail_url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c', created_at: new Date().toISOString() },
];

/**
 * ĐẢM BẢO LUÔN TRẢ VỀ TỐI THIỂU 5 CHƯƠNG TRÌNH
 */
export const fetchPrograms = async (): Promise<Program[]> => {
  try {
    const { data, error } = await supabase.from('programs').select('*').order('created_at', { ascending: false });
    
    let result = (data && data.length > 0) ? data : [...MOCK_PROGRAMS];
    
    // Nếu vẫn thiếu bài, bù thêm cho đủ 5
    if (result.length < 5) {
      const needed = 5 - result.length;
      const filler = MOCK_PROGRAMS.filter(m => !result.some(r => r.title === m.title)).slice(0, needed);
      result = [...result, ...filler];
    }
    return result;
  } catch {
    return MOCK_PROGRAMS;
  }
};

/**
 * THUẬT TOÁN STREAK CHUẨN
 */
function calculateActualStreak(history: string[]): number {
  if (!history || history.length === 0) return 0;
  const todayStr = toLocalDateString();
  const historySet = new Set(history.map(d => normalizeDateString(d)));
  
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  // Nếu hôm nay chưa tập, tính từ hôm qua
  if (!(checkDate.getDay() === 2 || checkDate.getDay() === 6) && !historySet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < 100; i++) {
    const checkStr = toLocalDateString(checkDate);
    const dayOfWeek = checkDate.getDay();
    const isRest = dayOfWeek === 2 || dayOfWeek === 6;

    if (historySet.has(checkStr)) {
      if (!isRest) streak++;
    } else {
      if (!isRest) break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export const completeWorkoutSession = async (programId: string, totalCalories: number, dateStr?: string, userId?: string): Promise<number | null> => {
  const targetDate = dateStr || toLocalDateString();
  const effectiveUserId = userId || 'local';

  if (targetDate > toLocalDateString()) return getUserStreak(effectiveUserId);

  if (programId.startsWith('mock-')) {
    const historyKey = '@mock_history';
    const existingHistory = await AsyncStorage.getItem(historyKey);
    const history = existingHistory ? JSON.parse(existingHistory) : [];
    if (!history.includes(targetDate)) {
      history.push(targetDate);
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    }
  } else {
    await supabase.rpc('complete_workout_session', { p_program_id: programId, p_workout_date: targetDate, p_total_calories: totalCalories });
  }

  const history = await getWorkoutHistory(effectiveUserId);
  return calculateActualStreak(history);
};

export const getWorkoutHistory = async (userId: string): Promise<string[]> => {
  const todayStr = toLocalDateString();
  let dbHistory: string[] = [];
  if (userId && userId !== 'local') {
    const { data } = await supabase.from('exercise_logs').select('workout_date').eq('user_id', userId);
    dbHistory = (data || []).map((item: any) => normalizeDateString(item.workout_date));
  }
  
  const localHistory = await AsyncStorage.getItem('@mock_history');
  let history = localHistory ? [...dbHistory, ...JSON.parse(localHistory)] : dbHistory;
  
  // DỌN DẸP DỮ LIỆU TƯƠNG LAI ĐỂ XÓA TÍCH XANH SAI
  return Array.from(new Set(history)).filter(d => d <= todayStr);
};

export const getUserStreak = async (userId: string): Promise<number> => {
  const history = await getWorkoutHistory(userId);
  return calculateActualStreak(history);
};

export const fetchExercisesByProgram = async (programId: string): Promise<Exercise[]> => {
  if (programId.startsWith('mock-')) {
    return [{ id: 'm1', program_id: programId, name: 'Bài tập mẫu', duration: 60, met_value: 7.0, media_url: 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', created_at: new Date().toISOString() }];
  }
  const { data } = await supabase.from('exercises').select('*').eq('program_id', programId).order('sort_order', { ascending: true });
  return (data as Exercise[]) || [];
};

export const logExercise = async (userId: string, exerciseId: string, calories: number, dateStr?: string) => {
  const targetDate = dateStr || toLocalDateString();
  if (targetDate > toLocalDateString() || exerciseId.startsWith('mock-')) return;
  await supabase.from('exercise_logs').insert({ user_id: userId, exercise_id: exerciseId, workout_date: targetDate, calories_burned: calories });
};
