/**
 * Tiện ích xử lý ngày theo timezone local của thiết bị.
 * Dùng cho biểu đồ 7 ngày, chuẩn hóa date từ Supabase, snapshot dinh dưỡng/nước.
 * Không dùng toISOString() cho bản ghi theo ngày vì chuyển sang UTC gây lệch ngày.
 */
const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Returns a calendar date in the device's local timezone.
 * Do not use toISOString() for daily health records because it converts to UTC.
 */
export function toLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function addLocalDays(date: Date, amount: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
}

/** Ngày local cách hôm nay `amount` ngày — dùng buildEmptyWeekly / biểu đồ 7 ngày. */
export function localDateDaysAgo(amount: number, from: Date = new Date()): string {
  return toLocalDateString(addLocalDays(from, -amount));
}

/** Chuẩn hóa date từ Supabase (có thể kèm timestamp). */
export function normalizeDateString(value: string): string {
  return value.slice(0, 10);
}

export function calculateAgeFromDate(dateOfBirth: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }
  return Math.max(0, age);
}
