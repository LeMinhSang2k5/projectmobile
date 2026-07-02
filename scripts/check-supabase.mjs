import 'dotenv/config'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const key =
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!url || !key) {
  console.error('Thieu EXPO_PUBLIC_SUPABASE_URL hoac EXPO_PUBLIC_SUPABASE_KEY trong .env')
  process.exit(1)
}

console.log('URL:', url)
console.log('Key prefix:', key.slice(0, 15) + '...')
console.log('Key length:', key.length)

const response = await fetch(`${url}/auth/v1/health`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
})

console.log('Health status:', response.status)
console.log(await response.text())

if (response.ok) {
  console.log('OK: API key hop le.')
  process.exit(0)
}

console.error('LOI: API key khong hop le voi project nay. Vao Supabase Dashboard > Project Settings > API va copy lai key.')
process.exit(1)
