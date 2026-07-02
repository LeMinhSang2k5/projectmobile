import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Thêm EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_KEY vào file .env, rồi chạy lại: npx expo start -c'
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
