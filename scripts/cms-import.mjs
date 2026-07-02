#!/usr/bin/env node
/**
 * Bulk import CMS content from CSV files.
 *
 * Usage:
 *   node scripts/cms-import.mjs --type foods --file data/foods.csv
 *   node scripts/cms-import.mjs --type programs --file data/programs.csv
 *
 * Requires .env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_KEY (admin user JWT session) OR SUPABASE_SECRET_KEY for service role
 *
 * CSV formats:
 *   foods: name,serving_size,calories,protein_g,carbs_g,fat_g
 *   programs: title,description,level,thumbnail_url
 *   exercises: program_title,name,duration,met_value,media_url,sort_order
 */

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const key =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim()

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL and key (SUPABASE_SECRET_KEY or EXPO_PUBLIC_SUPABASE_KEY)')
  process.exit(1)
}

const args = process.argv.slice(2)
const typeIdx = args.indexOf('--type')
const fileIdx = args.indexOf('--file')
const type = typeIdx >= 0 ? args[typeIdx + 1] : null
const file = fileIdx >= 0 ? args[fileIdx + 1] : null

if (!type || !file) {
  console.error('Usage: node scripts/cms-import.mjs --type foods|programs|exercises --file path.csv')
  process.exit(1)
}

const supabase = createClient(url, key)

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

async function importFoods(rows) {
  const payload = rows.map((row) => ({
    name: row.name,
    serving_size: row.serving_size || '1 phần',
    calories: Number(row.calories),
    protein_g: Number(row.protein_g || 0),
    carbs_g: Number(row.carbs_g || 0),
    fat_g: Number(row.fat_g || 0),
    is_custom: false,
  }))

  const { data, error } = await supabase.from('foods').insert(payload).select('id, name')
  if (error) throw error
  return data
}

async function importPrograms(rows) {
  const inserted = []
  for (const row of rows) {
    const { data, error } = await supabase
      .from('programs')
      .insert({
        title: row.title,
        description: row.description || null,
        level: row.level || 'Beginner',
        thumbnail_url: row.thumbnail_url || null,
      })
      .select('id, title')
      .single()
    if (error) throw error
    inserted.push(data)
  }
  return inserted
}

async function importExercises(rows) {
  const inserted = []
  for (const row of rows) {
    const { data: program, error: programError } = await supabase
      .from('programs')
      .select('id')
      .eq('title', row.program_title)
      .maybeSingle()
    if (programError) throw programError
    if (!program) throw new Error(`Program not found: ${row.program_title}`)

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        program_id: program.id,
        name: row.name,
        duration: Number(row.duration),
        met_value: Number(row.met_value),
        media_url: row.media_url || null,
        sort_order: Number(row.sort_order || 0),
      })
      .select('id, name')
      .single()
    if (error) throw error
    inserted.push(data)
  }
  return inserted
}

try {
  const csv = readFileSync(file, 'utf8')
  const rows = parseCsv(csv)
  let result

  if (type === 'foods') result = await importFoods(rows)
  else if (type === 'programs') result = await importPrograms(rows)
  else if (type === 'exercises') result = await importExercises(rows)
  else throw new Error(`Unknown type: ${type}`)

  console.log(`Imported ${result.length} ${type} row(s)`)
  console.log(result)
} catch (err) {
  console.error('Import failed:', err.message ?? err)
  process.exit(1)
}
