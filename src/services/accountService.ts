import { supabase } from '../../utils/supabase'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()

function functionsBaseUrl(): string {
  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL')
  }
  return `${supabaseUrl}/functions/v1`
}

async function getAccessToken(): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.')
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Bạn cần đăng nhập để thực hiện thao tác này.')
  return token
}

function authHeaders(token: string): Record<string, string> {
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? ''
  return {
    apikey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export type UserDataExport = {
  exported_at: string
  user_id: string
  profile: unknown
  workout_sessions: unknown[]
  exercise_logs: unknown[]
  meal_logs: unknown[]
  daily_nutrition: unknown[]
  daily_water_intake: unknown[]
  user_badges: unknown[]
  user_courses: unknown[]
  user_streaks: unknown[]
}

export async function exportUserData(): Promise<UserDataExport> {
  const token = await getAccessToken()
  const res = await fetch(`${functionsBaseUrl()}/export-user-data`, {
    headers: authHeaders(token),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error ?? 'Không thể xuất dữ liệu')
  }
  return body as UserDataExport
}

export async function deleteUserAccount(): Promise<void> {
  const token = await getAccessToken()
  const res = await fetch(`${functionsBaseUrl()}/delete-account`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ confirm: 'DELETE' }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error ?? 'Không thể xóa tài khoản')
  }
  await supabase.auth.signOut()
}
