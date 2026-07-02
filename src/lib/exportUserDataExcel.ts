import { cacheDirectory, writeAsStringAsync } from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as XLSX from 'xlsx'
import type { UserDataExport } from '../services/accountService'

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

type ColumnDef = { key: string; label: string; width?: number }

const FITNESS_GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Giảm cân',
  build_muscle: 'Tăng cơ',
  maintain: 'Duy trì',
  improve_cardio: 'Cải thiện cardio',
  flexibility: 'Linh hoạt',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Nam',
  female: 'Nữ',
  other: 'Khác',
}

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Ít vận động',
  lightly_active: 'Vận động nhẹ',
  moderately_active: 'Vận động vừa',
  very_active: 'Vận động nhiều',
  extra_active: 'Vận động rất nhiều',
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Sáng',
  lunch: 'Trưa',
  dinner: 'Tối',
  snack: 'Ăn vặt',
}

const PROFILE_FIELDS: ColumnDef[] = [
  { key: 'display_name', label: 'Tên hiển thị', width: 22 },
  { key: 'age', label: 'Tuổi', width: 8 },
  { key: 'gender', label: 'Giới tính', width: 12 },
  { key: 'date_of_birth', label: 'Ngày sinh', width: 14 },
  { key: 'height_cm', label: 'Chiều cao (cm)', width: 14 },
  { key: 'weight_kg', label: 'Cân nặng (kg)', width: 14 },
  { key: 'fitness_goal', label: 'Mục tiêu tập', width: 18 },
  { key: 'activity_level', label: 'Mức vận động', width: 18 },
  { key: 'bmi', label: 'BMI', width: 8 },
  { key: 'bmr', label: 'BMR (kcal)', width: 12 },
  { key: 'tdee', label: 'TDEE (kcal)', width: 12 },
  { key: 'daily_calorie_goal', label: 'Mục tiêu calo/ngày', width: 16 },
  { key: 'protein_goal_g', label: 'Protein mục tiêu (g)', width: 16 },
  { key: 'carbs_goal_g', label: 'Carbs mục tiêu (g)', width: 16 },
  { key: 'fat_goal_g', label: 'Fat mục tiêu (g)', width: 14 },
  { key: 'water_goal_ml', label: 'Mục tiêu nước (ml)', width: 16 },
  { key: 'wakeup_time', label: 'Giờ thức dậy', width: 14 },
  { key: 'water_reminder_enabled', label: 'Nhắc uống nước', width: 14 },
  { key: 'workout_reminder_enabled', label: 'Nhắc tập', width: 12 },
  { key: 'badge_notifications_enabled', label: 'Thông báo huy hiệu', width: 16 },
  { key: 'onboarding_completed', label: 'Hoàn thành onboarding', width: 18 },
  { key: 'role', label: 'Vai trò', width: 10 },
  { key: 'created_at', label: 'Tạo lúc', width: 20 },
  { key: 'updated_at', label: 'Cập nhật lúc', width: 20 },
]

const TABLE_COLUMNS: Record<string, ColumnDef[]> = {
  workout_sessions: [
    { key: 'workout_date', label: 'Ngày tập', width: 14 },
    { key: 'total_calories', label: 'Tổng calo đốt', width: 14 },
    { key: 'completed_at', label: 'Hoàn thành lúc', width: 20 },
    { key: 'program_id', label: 'Mã chương trình', width: 36 },
  ],
  exercise_logs: [
    { key: 'workout_date', label: 'Ngày tập', width: 14 },
    { key: 'calories_burned', label: 'Calo đốt', width: 12 },
    { key: 'exercise_id', label: 'Mã bài tập', width: 36 },
    { key: 'created_at', label: 'Ghi lúc', width: 20 },
  ],
  meal_logs: [
    { key: 'date', label: 'Ngày', width: 14 },
    { key: 'meal_type', label: 'Bữa', width: 12 },
    { key: 'created_at', label: 'Ghi lúc', width: 20 },
  ],
  daily_nutrition: [
    { key: 'date', label: 'Ngày', width: 14 },
    { key: 'calories_consumed', label: 'Calo đã nạp', width: 14 },
    { key: 'protein_g', label: 'Protein (g)', width: 12 },
    { key: 'carbs_g', label: 'Carbs (g)', width: 12 },
    { key: 'fat_g', label: 'Fat (g)', width: 12 },
  ],
  daily_water_intake: [
    { key: 'date', label: 'Ngày', width: 14 },
    { key: 'water_ml', label: 'Nước đã uống (ml)', width: 16 },
    { key: 'water_goal_ml', label: 'Mục tiêu (ml)', width: 14 },
    { key: 'water_cups', label: 'Số cốc', width: 10 },
  ],
  user_badges: [
    { key: 'earned_at', label: 'Ngày đạt', width: 20 },
    { key: 'badge_id', label: 'Mã huy hiệu', width: 36 },
  ],
  user_courses: [
    { key: 'completed_sessions', label: 'Buổi đã hoàn thành', width: 16 },
    { key: 'is_active', label: 'Đang theo học', width: 14 },
    { key: 'started_at', label: 'Bắt đầu', width: 20 },
    { key: 'course_id', label: 'Mã khóa học', width: 36 },
  ],
  user_streaks: [
    { key: 'current_streak', label: 'Streak hiện tại (ngày)', width: 18 },
    { key: 'longest_streak', label: 'Streak dài nhất (ngày)', width: 18 },
    { key: 'last_workout_date', label: 'Tập gần nhất', width: 14 },
    { key: 'updated_at', label: 'Cập nhật lúc', width: 20 },
  ],
}

function asRecordRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((row) => row && typeof row === 'object') as Record<string, unknown>[]
}

function formatDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  const text = String(value)
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return text
  if (text.length <= 10) {
    return parsed.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCellValue(key: string, value: unknown): string | number {
  if (value === null || value === undefined) return ''

  if (typeof value === 'boolean') return value ? 'Có' : 'Không'

  if (key === 'fitness_goal' && typeof value === 'string') {
    return FITNESS_GOAL_LABELS[value] ?? value
  }
  if (key === 'gender' && typeof value === 'string') {
    return GENDER_LABELS[value] ?? value
  }
  if (key === 'activity_level' && typeof value === 'string') {
    return ACTIVITY_LABELS[value] ?? value
  }
  if (key === 'meal_type' && typeof value === 'string') {
    return MEAL_TYPE_LABELS[value] ?? value
  }

  if (
    key.endsWith('_at') ||
    key.endsWith('_date') ||
    key === 'date' ||
    key === 'date_of_birth' ||
    key === 'earned_at'
  ) {
    return formatDate(value)
  }

  if (typeof value === 'number') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function mapRows(rows: Record<string, unknown>[], columns: ColumnDef[]): Record<string, string | number>[] {
  return rows.map((row) => {
    const mapped: Record<string, string | number> = {}
    for (const col of columns) {
      mapped[col.label] = formatCellValue(col.key, row[col.key])
    }
    return mapped
  })
}

function applyColumnWidths(sheet: XLSX.WorkSheet, columns: ColumnDef[]) {
  sheet['!cols'] = columns.map((col) => ({ wch: col.width ?? 16 }))
}

function buildReadableSheet(
  rows: Record<string, unknown>[],
  columns: ColumnDef[],
  emptyMessage: string,
): XLSX.WorkSheet {
  if (!rows.length) {
    const sheet = XLSX.utils.aoa_to_sheet([
      columns.map((col) => col.label),
      columns.map(() => emptyMessage),
    ])
    applyColumnWidths(sheet, columns)
    return sheet
  }

  const sheet = XLSX.utils.json_to_sheet(mapRows(rows, columns), { skipHeader: false })
  applyColumnWidths(sheet, columns)
  return sheet
}

function profileToSheet(profile: unknown): XLSX.WorkSheet {
  if (!profile || typeof profile !== 'object') {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Trường', 'Giá trị'],
      ['—', 'Không có dữ liệu hồ sơ'],
    ])
    sheet['!cols'] = [{ wch: 28 }, { wch: 36 }]
    return sheet
  }

  const record = profile as Record<string, unknown>
  const rows = PROFILE_FIELDS.filter(
    (field) => record[field.key] !== null && record[field.key] !== undefined && record[field.key] !== '',
  ).map((field) => ({
    Trường: field.label,
    'Giá trị': formatCellValue(field.key, record[field.key]),
  }))

  if (!rows.length) {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Trường', 'Giá trị'],
      ['—', 'Không có dữ liệu hồ sơ'],
    ])
    sheet['!cols'] = [{ wch: 28 }, { wch: 36 }]
    return sheet
  }

  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [{ wch: 28 }, { wch: 36 }]
  return sheet
}

function buildOverviewSheet(data: UserDataExport): XLSX.WorkSheet {
  const profile =
    data.profile && typeof data.profile === 'object'
      ? (data.profile as Record<string, unknown>)
      : null

  const exportedAt = formatDate(data.exported_at)
  const rows: [string, string | number][] = [
    ['Xuất lúc', exportedAt],
    ['Mã người dùng', data.user_id],
    ['Tên hiển thị', profile?.display_name ? String(profile.display_name) : '—'],
    ['Mục tiêu calo/ngày', profile?.daily_calorie_goal != null ? Number(profile.daily_calorie_goal) : '—'],
    ['Mục tiêu nước (ml)', profile?.water_goal_ml != null ? Number(profile.water_goal_ml) : '—'],
    ['', ''],
    ['Tổng buổi tập', asRecordRows(data.workout_sessions).length],
    ['Tổng log bài tập', asRecordRows(data.exercise_logs).length],
    ['Tổng bữa ăn ghi nhận', asRecordRows(data.meal_logs).length],
    ['Số ngày dinh dưỡng', asRecordRows(data.daily_nutrition).length],
    ['Số ngày theo dõi nước', asRecordRows(data.daily_water_intake).length],
    ['Huy hiệu đã đạt', asRecordRows(data.user_badges).length],
    ['Khóa học đang theo', asRecordRows(data.user_courses).length],
  ]

  const streak = asRecordRows(data.user_streaks)[0]
  if (streak) {
    rows.push(['Streak hiện tại (ngày)', formatCellValue('current_streak', streak.current_streak)])
    rows.push(['Streak dài nhất (ngày)', formatCellValue('longest_streak', streak.longest_streak)])
  }

  const sheet = XLSX.utils.aoa_to_sheet([['Mục', 'Giá trị'], ...rows])
  sheet['!cols'] = [{ wch: 28 }, { wch: 40 }]
  return sheet
}

export function buildUserDataWorkbook(data: UserDataExport): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, buildOverviewSheet(data), 'Tổng quan')
  XLSX.utils.book_append_sheet(workbook, profileToSheet(data.profile), 'Hồ sơ')
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.workout_sessions),
      TABLE_COLUMNS.workout_sessions,
      'Chưa có buổi tập',
    ),
    'Buổi tập',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.exercise_logs),
      TABLE_COLUMNS.exercise_logs,
      'Chưa có log bài tập',
    ),
    'Log bài tập',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(asRecordRows(data.meal_logs), TABLE_COLUMNS.meal_logs, 'Chưa có bữa ăn'),
    'Bữa ăn',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.daily_nutrition),
      TABLE_COLUMNS.daily_nutrition,
      'Chưa có dữ liệu dinh dưỡng',
    ),
    'Dinh dưỡng ngày',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.daily_water_intake),
      TABLE_COLUMNS.daily_water_intake,
      'Chưa có dữ liệu nước',
    ),
    'Nước uống',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.user_badges),
      TABLE_COLUMNS.user_badges,
      'Chưa có huy hiệu',
    ),
    'Huy hiệu',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.user_courses),
      TABLE_COLUMNS.user_courses,
      'Chưa tham gia khóa học',
    ),
    'Khóa học',
  )
  XLSX.utils.book_append_sheet(
    workbook,
    buildReadableSheet(
      asRecordRows(data.user_streaks),
      TABLE_COLUMNS.user_streaks,
      'Chưa có streak',
    ),
    'Streak',
  )

  return workbook
}

export async function shareUserDataExcel(data: UserDataExport): Promise<string> {
  const workbook = buildUserDataWorkbook(data)
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
  const stamp = new Date().toISOString().slice(0, 10)
  if (!cacheDirectory) {
    throw new Error('Không thể tạo file tạm trên thiết bị này.')
  }
  const fileUri = `${cacheDirectory}fitlife-export-${stamp}.xlsx`

  await writeAsStringAsync(fileUri, base64, { encoding: 'base64' })

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    throw new Error('Thiết bị không hỗ trợ chia sẻ file. File đã lưu tạm trong cache app.')
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: EXCEL_MIME,
    dialogTitle: 'Xuất dữ liệu FitLife (.xlsx)',
    UTI: 'com.microsoft.excel.xlsx',
  })

  return fileUri
}
