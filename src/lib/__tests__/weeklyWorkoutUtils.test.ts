/** Unit test normalizeWeeklyWorkouts — đủ 7 ngày, chuẩn hóa timestamp, merge dữ liệu. @see mục 8.1 đặc tả */
import assert from 'node:assert/strict';
import { localDateDaysAgo } from '../dateUtils';
import { normalizeWeeklyWorkouts } from '../weeklyWorkoutUtils';

const today = localDateDaysAgo(0);
const sixDaysAgo = localDateDaysAgo(6);

// 1. Input rỗng -> 7 ngày, tất cả = 0
const empty = normalizeWeeklyWorkouts([]);
assert.equal(empty.length, 7);
assert.equal(empty[0].date, sixDaysAgo);
assert.equal(empty[6].date, today);
assert.ok(empty.every((day) => day.workouts === 0 && day.calories_burned === 0));

// 2. Input không phải mảng -> vẫn trả 7 ngày mặc định
assert.equal(normalizeWeeklyWorkouts(null).length, 7);
assert.equal(normalizeWeeklyWorkouts(undefined).length, 7);
assert.equal(normalizeWeeklyWorkouts('invalid').length, 7);

// 3. Date kèm timestamp -> chuẩn hóa và merge đúng ngày hôm nay
const withTimestamp = normalizeWeeklyWorkouts([
  { date: `${today} 00:00:00`, workouts: 1, calories_burned: 320 },
]);
const todayRow = withTimestamp.find((day) => day.date === today);
assert.equal(todayRow?.workouts, 1);
assert.equal(todayRow?.calories_burned, 320);
assert.equal(
  withTimestamp.filter((day) => day.workouts === 0).length,
  6,
  'các ngày còn lại phải là 0',
);

// 4. Ngày ngoài cửa sổ 7 ngày -> bỏ qua
const outsideWindow = normalizeWeeklyWorkouts([
  { date: '2020-01-01', workouts: 99, calories_burned: 9999 },
]);
assert.ok(outsideWindow.every((day) => day.workouts === 0));

// 5. Phần tử lỗi trong mảng -> bỏ qua, không crash
const dirtyInput = normalizeWeeklyWorkouts([
  null,
  'bad',
  42,
  { date: `${today}T12:00:00`, workouts: 2, calories_burned: 500 },
]);
assert.equal(dirtyInput.find((day) => day.date === today)?.workouts, 2);

// 6. Nhiều ngày có dữ liệu -> merge đúng từng ngày
const yesterday = localDateDaysAgo(1);
const multiDay = normalizeWeeklyWorkouts([
  { date: yesterday, workouts: 1, calories_burned: 200 },
  { date: today, workouts: 2, calories_burned: 400 },
]);
assert.equal(multiDay.find((day) => day.date === yesterday)?.workouts, 1);
assert.equal(multiDay.find((day) => day.date === today)?.workouts, 2);
assert.equal(multiDay.find((day) => day.date === today)?.calories_burned, 400);

// 7. Thiếu field -> mặc định 0
const missingFields = normalizeWeeklyWorkouts([{ date: today }]);
assert.equal(missingFields.find((day) => day.date === today)?.workouts, 0);
assert.equal(missingFields.find((day) => day.date === today)?.calories_burned, 0);

console.log('weeklyWorkoutUtils tests passed');
