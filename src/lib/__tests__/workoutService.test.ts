import { calculateCalories, updateUserStreak } from '../workoutService';
import { supabase } from '../../../utils/supabase';

// Mock Supabase client
jest.mock('../../../utils/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    })),
  },
}));

describe('Workout Logic Core', () => {
  
  describe('calculateCalories', () => {
    test('nên tính toán chính xác calo theo công thức METs (Trường hợp chuẩn)', () => {
      // MET: 8.0 (Chạy bộ), Cân nặng: 70kg, Thời gian: 1800s (30 phút)
      // Công thức: (8 * 3.5 * 70 / 200) * (1800 / 60) = 9.8 * 30 = 294
      const result = calculateCalories(8.0, 70, 1800);
      expect(result).toBe(294);
    });

    test('nên trả về 0 nếu thời gian tập bằng 0', () => {
      const result = calculateCalories(5.0, 60, 0);
      expect(result).toBe(0);
    });

    test('nên trả về 0 nếu MET bằng 0', () => {
      const result = calculateCalories(0, 60, 600);
      expect(result).toBe(0);
    });
  });

  describe('updateUserStreak (Logic Chuỗi ngày tập)', () => {
    const userId = 'test-user-uuid';
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('nên tăng streak lên 1 nếu ngày tập gần nhất là hôm qua', async () => {
      // Mock dữ liệu: hôm qua đã tập, streak đang là 5
      (supabase.from as jest.Mock)().maybeSingle.mockResolvedValue({
        data: { current_streak: 5, last_workout_date: yesterday },
        error: null,
      });

      const newStreak = await updateUserStreak(userId);
      
      expect(newStreak).toBe(6);
      // Kiểm tra xem có gọi lệnh update vào DB không
      expect(supabase.from).toHaveBeenCalledWith('user_streaks');
    });

    test('nên reset streak về 1 nếu bỏ tập từ 2 ngày trở lên', async () => {
      // Mock dữ liệu: ngày tập cuối là 2 ngày trước, streak cũ là 10
      (supabase.from as jest.Mock)().maybeSingle.mockResolvedValue({
        data: { current_streak: 10, last_workout_date: twoDaysAgo },
        error: null,
      });

      const newStreak = await updateUserStreak(userId);
      
      expect(newStreak).toBe(1);
    });

    test('nên giữ nguyên streak nếu đã tập trong ngày hôm nay', async () => {
      (supabase.from as jest.Mock)().maybeSingle.mockResolvedValue({
        data: { current_streak: 3, last_workout_date: today },
        error: null,
      });

      const newStreak = await updateUserStreak(userId);
      
      expect(newStreak).toBe(3);
    });

    test('nên tạo record mới với streak = 1 nếu người dùng mới tập lần đầu', async () => {
      // Mock không có dữ liệu cũ
      (supabase.from as jest.Mock)().maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const newStreak = await updateUserStreak(userId);
      
      expect(newStreak).toBe(1);
      expect(supabase.from('').insert).toHaveBeenCalled();
    });
  });
});
