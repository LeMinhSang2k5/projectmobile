/**
 * Service khóa tập — lấy tiến độ khóa học / chương trình cho Dashboard & Profile.
 */
import { supabase } from '../../utils/supabase';
import type { Program, UserCourse, WorkoutCardSummary, WorkoutCourse } from '../types';

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80';

const DIFFICULTY_LABELS: Record<WorkoutCourse['difficulty'], string> = {
  beginner: 'Cơ bản',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

const MUSCLE_LABELS: Record<string, string> = {
  full_body: 'Toàn thân',
  mobility: 'Linh hoạt',
  upper_body: 'Thân trên',
  lower_body: 'Thân dưới',
  core: 'Cơ lõi',
};

const PROGRAM_LEVEL_LABELS: Record<Program['level'], string> = {
  Beginner: 'Cơ bản',
  Intermediate: 'Trung cấp',
  Advanced: 'Nâng cao',
};

function muscleLabel(value: string | null | undefined): string {
  if (!value) return 'Toàn thân';
  return MUSCLE_LABELS[value] ?? value.replace(/_/g, ' ');
}

function mapUserCourseToSummary(course: UserCourse): WorkoutCardSummary {
  const meta = course.workout_courses;
  const totalSessions = meta?.total_sessions ?? null;
  const sessionsCompleted = course.completed_sessions;
  const progressPercent =
    totalSessions && totalSessions > 0
      ? Math.min(100, Math.round((sessionsCompleted / totalSessions) * 100))
      : null;
  const remaining =
    totalSessions != null ? Math.max(totalSessions - sessionsCompleted, 0) : null;

  return {
    title: meta?.title ?? 'Khóa tập',
    subtitle:
      totalSessions != null
        ? `Buổi ${sessionsCompleted} / ${totalSessions} • ${muscleLabel(meta?.target_muscle)}`
        : `${muscleLabel(meta?.target_muscle)} • ${DIFFICULTY_LABELS[meta?.difficulty ?? 'beginner']}`,
    progressPercent,
    sessionsCompleted,
    totalSessions,
    remainingLabel:
      remaining != null && remaining > 0
        ? `${remaining} buổi còn lại`
        : remaining === 0
          ? 'Đã hoàn thành khóa'
          : null,
    thumbnailUrl: DEFAULT_THUMBNAIL,
  };
}

function mapProgramToSummary(program: Program, completedSessions: number): WorkoutCardSummary {
  return {
    title: program.title,
    subtitle: `${completedSessions} buổi đã hoàn thành • ${PROGRAM_LEVEL_LABELS[program.level]}`,
    progressPercent: null,
    sessionsCompleted: completedSessions,
    totalSessions: null,
    remainingLabel: 'Tiếp tục luyện tập',
    thumbnailUrl: program.thumbnail_url ?? DEFAULT_THUMBNAIL,
  };
}

/** Khóa tập đang active của user (user_courses + workout_courses). */
export async function getActiveUserCourse(userId: string): Promise<UserCourse | null> {
  const { data, error } = await supabase
    .from('user_courses')
    .select('*, workout_courses(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Chương trình gần nhất user đã tập (fallback khi chưa đăng ký khóa học). */
async function getRecentProgramProgress(
  userId: string,
): Promise<{ program: Program; completedSessions: number } | null> {
  const { data: latest, error: latestError } = await supabase
    .from('workout_sessions')
    .select('program_id, programs(id, title, description, level, thumbnail_url, created_at)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;
  const rawProgram = latest?.programs;
  const program = (Array.isArray(rawProgram) ? rawProgram[0] : rawProgram) as Program | null;
  if (!program || !latest?.program_id) return null;

  const { count, error: countError } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('program_id', latest.program_id);

  if (countError) throw countError;

  return {
    program,
    completedSessions: count ?? 0,
  };
}

/**
 * Dữ liệu cho WorkoutCard trên Dashboard.
 * Ưu tiên khóa tập active; nếu không có thì lấy chương trình tập gần nhất.
 */
export async function getWorkoutCardSummary(userId: string): Promise<WorkoutCardSummary | null> {
  const activeCourse = await getActiveUserCourse(userId);
  if (activeCourse?.workout_courses) {
    return mapUserCourseToSummary(activeCourse);
  }

  const recentProgram = await getRecentProgramProgress(userId);
  if (recentProgram) {
    return mapProgramToSummary(recentProgram.program, recentProgram.completedSessions);
  }

  return null;
}
