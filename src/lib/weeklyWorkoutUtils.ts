import { FitnessGoal } from './healthCalculations';
import { Program, WeeklyWorkoutDay } from '../types';
import { localDateDaysAgo, normalizeDateString } from './dateUtils';

export type DayPlan = {
  dayName: string;
  date: Date;
  isRestDay: boolean;
  suggestedProgramId?: string;
};

/**
 * Tiện ích chuẩn hóa dữ liệu biểu đồ 7 ngày.
 * Server RPC dùng current_date (timezone DB); client tạo khung 7 ngày theo timezone máy.
 */
export function buildEmptyWeekly(): WeeklyWorkoutDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: localDateDaysAgo(6 - index),
    workouts: 0,
    calories_burned: 0,
  }));
}

/**
 * Đảm bảo biểu đồ luôn nhận đúng 7 ngày, kể cả khi server trả thiếu hoặc date kèm timestamp.
 * Merge dữ liệu RPC vào khung 7 ngày local; ngày ngoài phạm vi bị bỏ qua.
 */
export function normalizeWeeklyWorkouts(raw: unknown): WeeklyWorkoutDay[] {
  const base = buildEmptyWeekly();
  if (!Array.isArray(raw) || raw.length === 0) return base;

  const map = new Map(base.map((day) => [day.date, { ...day }]));
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const date = normalizeDateString(String(row.date ?? ''));
    if (!map.has(date)) continue;
    map.set(date, {
      date,
      workouts: Number(row.workouts ?? 0),
      calories_burned: Number(row.calories_burned ?? 0),
    });
  }

  return base.map((day) => map.get(day.date) ?? day);
}

/**
 * Tạo lịch tập 7 ngày dựa trên mục tiêu sức khỏe và BMI.
 * Quy tắc: 5 ngày tập, 2 ngày nghỉ (Thứ 4 và Chủ Nhật).
 */
export function generateWeeklyPlan(
  userGoal: FitnessGoal | null,
  allPrograms: Program[],
  startDate: Date = new Date(),
  bmi: number = 22
): DayPlan[] {
  const plan: DayPlan[] = [];
  const startDay = new Date(startDate);
  // Đưa về đầu tuần (Thứ 2)
  const dayOfWeek = startDay.getDay(); // 0 (CN) -> 6 (T7)
  const diff = startDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(startDay.setDate(diff));

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    
    const dayIndex = currentDate.getDay(); // 0: CN, 1: T2, ..., 6: T7
    const isRestDay = dayIndex === 0 || dayIndex === 3; // Nghỉ Chủ Nhật và Thứ 4

    let suggestedId: string | undefined;
    if (!isRestDay) {
      suggestedId = pickProgramForGoal(userGoal, allPrograms, i, bmi);
    }

    plan.push({
      dayName: currentDate.toLocaleDateString('vi-VN', { weekday: 'long' }),
      date: currentDate,
      isRestDay,
      suggestedProgramId: suggestedId,
    });
  }

  return plan;
}

function pickProgramForGoal(
  goal: FitnessGoal | null,
  programs: Program[],
  index: number,
  bmi: number
): string | undefined {
  if (programs.length === 0) return undefined;

  let filtered = programs;

  // Thuật toán chọn bài tập nâng cao dựa trên BMI và Goal
  if (bmi > 25 || goal === 'lose_weight') {
    // Ưu tiên HIIT hoặc Cardio để đốt calo
    filtered = programs.filter(p => 
      p.title.toLowerCase().includes('hiit') || 
      p.title.toLowerCase().includes('cardio') ||
      p.level === 'Advanced'
    );
  } else if (bmi < 18.5 || goal === 'build_muscle') {
    // Ưu tiên các bài tập sức mạnh
    filtered = programs.filter(p => 
      p.title.toLowerCase().includes('sức mạnh') || 
      p.title.toLowerCase().includes('elite') ||
      p.level === 'Intermediate'
    );
  } else if (goal === 'flexibility') {
    filtered = programs.filter(p => p.title.toLowerCase().includes('yoga'));
  }

  if (filtered.length === 0) filtered = programs;
  
  return filtered[index % filtered.length]?.id;
}
