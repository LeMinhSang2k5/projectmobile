import { FitnessGoal } from './healthCalculations';
import { Program, WeeklyWorkoutDay } from '../types';
import { localDateDaysAgo, normalizeDateString } from './dateUtils';

export type DayPlan = {
  dayName: string;
  date: Date;
  isRestDay: boolean;
  suggestedProgramId?: string;
};

export function buildEmptyWeekly(): WeeklyWorkoutDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: localDateDaysAgo(6 - index),
    workouts: 0,
    calories_burned: 0,
  }));
}

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
 * Lịch nghỉ mới: Thứ 3 và Thứ 7.
 * T2(Nặng) -> T3(Nghỉ) | T4(Vừa) | T5(Vừa) | T6(Nặng) -> T7(Nghỉ) | CN(Nhẹ)
 */
export function generateWeeklyPlan(
  userGoal: FitnessGoal | null,
  allPrograms: Program[],
  startDate: Date = new Date(),
  bmi: number = 22
): DayPlan[] {
  const plan: DayPlan[] = [];
  const startDay = new Date(startDate);
  const dayOfWeek = startDay.getDay(); 
  const diff = startDay.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(startDay.setDate(diff));

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);
    
    // i=1: Thứ 3, i=5: Thứ 7 (Lịch nghỉ khớp với phản hồi của bạn)
    const isRestDay = i === 1 || i === 5;

    let suggestedId: string | undefined;
    if (!isRestDay) {
      suggestedId = pickProgramForGoal(userGoal, allPrograms, i, bmi, currentDate);
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
  dayIndex: number, 
  bmi: number,
  date: Date
): string | undefined {
  if (programs.length === 0) return undefined;

  const isHeavyDay = dayIndex === 0 || dayIndex === 4; // T2 và T6 nặng
  let filtered = programs;

  if (isHeavyDay) {
    filtered = programs.filter(p => 
      p.level === 'Advanced' || 
      p.title.toLowerCase().includes('hiit') || 
      p.title.toLowerCase().includes('elite') ||
      p.title.toLowerCase().includes('sức mạnh')
    );
  } else if (dayIndex === 6) { // CN
    filtered = programs.filter(p => 
      p.title.toLowerCase().includes('yoga') || 
      p.title.toLowerCase().includes('stretch') ||
      p.level === 'Beginner'
    );
  } else {
    if (bmi > 25 || goal === 'lose_weight') {
      filtered = programs.filter(p => p.title.toLowerCase().includes('cardio') || p.level === 'Intermediate');
    } else if (bmi < 18.5 || goal === 'build_muscle') {
      filtered = programs.filter(p => p.title.toLowerCase().includes('sức mạnh') || p.level === 'Intermediate');
    }
  }

  if (filtered.length === 0) filtered = programs;
  
  const weekOfYear = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
  const seed = date.getDate() + weekOfYear;
  const rotationOffset = (dayIndex + seed) % filtered.length;
  
  return filtered[rotationOffset]?.id;
}
