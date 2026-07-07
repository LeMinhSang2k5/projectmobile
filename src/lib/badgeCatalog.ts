/**
 * Danh mục huy hiệu fallback khi không tải được bảng `badges` từ Supabase.
 * Chỉ có 4 badge đầu; migration chính seed đủ 8 badge.
 * @see docs/pdf/dac_ta_ky_thuat_de_hieu.pdf — mục 4.5
 */
import type { Badge } from '../types';

export const FALLBACK_BADGES: Badge[] = [
  {
    id: 'fallback-onboarding',
    code: 'onboarding_complete',
    title: 'Khởi đầu',
    description: 'Hoàn thành onboarding lần đầu',
    icon: 'flag',
    criteria_type: 'onboarding',
    criteria_value: 1,
    sort_order: 1,
  },
  {
    id: 'fallback-first-workout',
    code: 'first_workout',
    title: 'Buổi tập đầu',
    description: 'Hoàn thành buổi tập đầu tiên',
    icon: 'fitness-center',
    criteria_type: 'workout_sessions',
    criteria_value: 1,
    sort_order: 2,
  },
  {
    id: 'fallback-streak-3',
    code: 'streak_3',
    title: 'Kiên trì 3 ngày',
    description: 'Duy trì chuỗi tập 3 ngày liên tiếp',
    icon: 'local-fire-department',
    criteria_type: 'streak',
    criteria_value: 3,
    sort_order: 3,
  },
  {
    id: 'fallback-streak-7',
    code: 'streak_7',
    title: 'Tuần vàng',
    description: 'Duy trì chuỗi tập 7 ngày liên tiếp',
    icon: 'whatshot',
    criteria_type: 'streak',
    criteria_value: 7,
    sort_order: 4,
  },
];
