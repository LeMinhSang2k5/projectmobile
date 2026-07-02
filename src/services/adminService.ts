import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../utils/supabase'
import type { Badge, Exercise, Food, Program, WorkoutCourse } from '../types'

export type CmsStatus = {
  status: string
  service: string
  schema_version: string
  counts: {
    programs: number
    exercises: number
    system_foods: number
    badges: number
  }
  storage_buckets: string[]
  checks: Record<string, boolean>
  errors: string[]
}

export type ProgramInput = {
  title: string
  description?: string | null
  level: Program['level']
  thumbnail_url?: string | null
}

export type ExerciseInput = {
  program_id: string
  name: string
  duration: number
  met_value: number
  media_url?: string | null
  sort_order?: number
}

export type FoodInput = {
  name: string
  serving_size: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export type BadgeInput = {
  code: string
  title: string
  description: string
  icon: string
  criteria_type: string
  criteria_value: number
  sort_order: number
}

export type WorkoutCourseInput = {
  title: string
  total_sessions: number
  target_muscle?: string | null
  difficulty: WorkoutCourse['difficulty']
  description?: string | null
}

export type ProgramOption = Pick<Program, 'id' | 'title'>

export type MediaBucket = 'program-thumbnails' | 'exercise-media'

export type ImportType = 'foods' | 'programs' | 'exercises'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()

function functionsBaseUrl(): string {
  if (!supabaseUrl) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL')
  return `${supabaseUrl}/functions/v1`
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error('Cần đăng nhập admin')
  return token
}

export async function fetchCmsStatus(): Promise<CmsStatus> {
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? ''
  const res = await fetch(`${functionsBaseUrl()}/cms-status`, {
    headers: {
      apikey,
      Authorization: `Bearer ${apikey}`,
    },
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return body as CmsStatus
}

export async function uploadMediaFile(input: {
  bucket: MediaBucket
  path: string
  localUri: string
  contentType: string
}): Promise<{ publicUrl: string }> {
  const token = await getAccessToken()
  const apikey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? ''

  const signedRes = await fetch(`${functionsBaseUrl()}/media-upload`, {
    method: 'POST',
    headers: {
      apikey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket: input.bucket,
      path: input.path,
      contentType: input.contentType,
    }),
  })
  const signedBody = await signedRes.json()
  if (!signedRes.ok) {
    throw new Error(signedBody.error ?? 'Không lấy được signed URL')
  }

  const base64 = await FileSystem.readAsStringAsync(input.localUri, {
    encoding: 'base64',
  })

  const uploadRes = await fetch(signedBody.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': input.contentType },
    body: decode(base64),
  })
  if (!uploadRes.ok) {
    throw new Error(`Upload failed: HTTP ${uploadRes.status}`)
  }

  return { publicUrl: signedBody.publicUrl as string }
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(',').map((v) => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })
}

export async function importCsvRows(type: ImportType, csvText: string): Promise<number> {
  const rows = parseCsv(csvText)
  if (!rows.length) throw new Error('CSV trống hoặc không hợp lệ')

  if (type === 'foods') {
    const payload = rows.map((row) => ({
      name: row.name,
      serving_size: row.serving_size || '1 phần',
      calories: Number(row.calories),
      protein_g: Number(row.protein_g || 0),
      carbs_g: Number(row.carbs_g || 0),
      fat_g: Number(row.fat_g || 0),
      is_custom: false,
    }))
    const { error } = await supabase.from('foods').insert(payload)
    if (error) throw error
    return payload.length
  }

  if (type === 'programs') {
    let count = 0
    for (const row of rows) {
      const { error } = await supabase.from('programs').insert({
        title: row.title,
        description: row.description || null,
        level: (row.level as Program['level']) || 'Beginner',
        thumbnail_url: row.thumbnail_url || null,
      })
      if (error) throw error
      count += 1
    }
    return count
  }

  let count = 0
  for (const row of rows) {
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('title', row.program_title)
      .maybeSingle()
    if (programError) throw programError
    if (!program) throw new Error(`Không tìm thấy program: ${row.program_title}`)

    const { error } = await supabase.from('exercises').insert({
      program_id: program.id,
      name: row.name,
      duration: Number(row.duration),
      met_value: Number(row.met_value),
      media_url: row.media_url || null,
      sort_order: Number(row.sort_order || 0),
    })
    if (error) throw error
    count += 1
  }
  return count
}

export async function listPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Program[]
}

export async function listProgramOptions(): Promise<ProgramOption[]> {
  const { data, error } = await supabase.from('programs').select('id, title').order('title')
  if (error) throw error
  return (data ?? []) as ProgramOption[]
}

export async function createProgram(input: ProgramInput): Promise<void> {
  const { error } = await supabase.from('programs').insert(input)
  if (error) throw error
}

export async function updateProgram(id: string, input: ProgramInput): Promise<void> {
  const { error } = await supabase.from('programs').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) throw error
}

export async function listExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase.from('exercises').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Exercise[]
}

export async function createExercise(input: ExerciseInput): Promise<void> {
  const { error } = await supabase.from('exercises').insert(input)
  if (error) throw error
}

export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  const { error } = await supabase.from('exercises').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) throw error
}

export async function listSystemFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('is_custom', false)
    .order('name')
  if (error) throw error
  return (data ?? []) as Food[]
}

export async function createSystemFood(input: FoodInput): Promise<void> {
  const { error } = await supabase.from('foods').insert({ ...input, is_custom: false })
  if (error) throw error
}

export async function updateFood(id: string, input: FoodInput): Promise<void> {
  const { error } = await supabase.from('foods').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteFood(id: string): Promise<void> {
  const { error } = await supabase.from('foods').delete().eq('id', id)
  if (error) throw error
}

export async function listBadges(): Promise<Badge[]> {
  const { data, error } = await supabase.from('badges').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as Badge[]
}

export async function createBadge(input: BadgeInput): Promise<void> {
  const { error } = await supabase.from('badges').insert(input)
  if (error) throw error
}

export async function updateBadge(id: string, input: BadgeInput): Promise<void> {
  const { error } = await supabase.from('badges').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteBadge(id: string): Promise<void> {
  const { error } = await supabase.from('badges').delete().eq('id', id)
  if (error) throw error
}

export async function listWorkoutCourses(): Promise<WorkoutCourse[]> {
  const { data, error } = await supabase.from('workout_courses').select('*').order('title')
  if (error) throw error
  return (data ?? []) as WorkoutCourse[]
}

export async function createWorkoutCourse(input: WorkoutCourseInput): Promise<void> {
  const { error } = await supabase.from('workout_courses').insert(input)
  if (error) throw error
}

export async function updateWorkoutCourse(id: string, input: WorkoutCourseInput): Promise<void> {
  const { error } = await supabase.from('workout_courses').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteWorkoutCourse(id: string): Promise<void> {
  const { error } = await supabase.from('workout_courses').delete().eq('id', id)
  if (error) throw error
}
