#!/usr/bin/env node
/**
 * Validates export/delete edge function contracts (without destructive delete in CI).
 */

import 'dotenv/config'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim()

if (!url || !publishableKey) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY')
  process.exit(1)
}

let passed = 0
let failed = 0

function ok(name) {
  passed += 1
  console.log(`OK  ${name}`)
}

function fail(name, detail) {
  failed += 1
  console.error(`FAIL ${name}: ${detail}`)
}

async function testExportRequiresAuth() {
  const res = await fetch(`${url}/functions/v1/export-user-data`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  })
  if (res.status === 404) {
    console.log('SKIP export-user-data (deploy function first)')
    return
  }
  if (res.status === 401 || res.status === 403) ok('export-user-data rejects anonymous/publishable token')
  else fail('export-user-data rejects anonymous/publishable token', `HTTP ${res.status}`)
}

async function testDeleteRequiresConfirmation() {
  const res = await fetch(`${url}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  if (res.status === 404) {
    console.log('SKIP delete-account (deploy function first)')
    return
  }
  const body = await res.json()
  if (res.status === 401 || res.status === 403) {
    ok('delete-account rejects unauthenticated caller')
  } else if (res.status === 400 && body.hint) {
    ok('delete-account requires DELETE confirmation when authenticated')
  } else {
    fail('delete-account contract', `HTTP ${res.status} ${JSON.stringify(body)}`)
  }
}

async function testMediaUploadRequiresAdmin() {
  const res = await fetch(`${url}/functions/v1/media-upload`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket: 'exercise-media',
      path: 'demo/sample.gif',
      contentType: 'image/gif',
    }),
  })
  if (res.status === 404) {
    console.log('SKIP media-upload (deploy function first)')
    return
  }
  if (res.status === 401 || res.status === 403) {
    ok('media-upload rejects non-admin/publishable caller')
  } else {
    const body = await res.json().catch(() => ({}))
    fail('media-upload rejects non-admin caller', `HTTP ${res.status} ${JSON.stringify(body)}`)
  }
}

await testExportRequiresAuth()
await testDeleteRequiresConfirmation()
await testMediaUploadRequiresAdmin()

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
