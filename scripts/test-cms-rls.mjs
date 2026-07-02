#!/usr/bin/env node
/**
 * Smoke tests for CMS admin RLS expectations.
 * Requires SUPABASE_SECRET_KEY in .env for setup, plus optional test user credentials.
 *
 * Without test users, validates migration artifacts via publishable key + cms-status.
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

async function testCmsStatus() {
  const res = await fetch(`${url}/functions/v1/cms-status`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  })
  const body = await res.json()
  if (!res.ok) {
    if (res.status === 404) {
      console.log('SKIP cms-status (deploy function first)')
      return
    }
    fail('cms-status reachable', `HTTP ${res.status}`)
    return
  }
  ok('cms-status reachable')
  if (body.service === 'fitlife-cms') ok('cms-status service id')
  else fail('cms-status service id', JSON.stringify(body))
  if (typeof body.counts?.programs === 'number') ok('cms-status returns program count')
  else fail('cms-status program count', JSON.stringify(body.counts))
}

async function testSchemaVersion() {
  const res = await fetch(`${url}/rest/v1/cms_meta?key=eq.schema_version&select=value`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
  })
  if (!res.ok) {
    if (res.status === 404) {
      console.log('SKIP cms_meta test (migration not applied or REST blocked)')
      return
    }
    fail('cms_meta readable', `HTTP ${res.status}`)
    return
  }
  const rows = await res.json()
  if (Array.isArray(rows) && rows[0]?.value) ok('cms_meta schema_version present')
  else fail('cms_meta schema_version present', JSON.stringify(rows))
}

async function testNonAdminCannotInsertProgram() {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim()
  if (!secret) {
    console.log('SKIP non-admin insert test (set SUPABASE_SECRET_KEY to run full RLS checks)')
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `cms-test-${Date.now()}@example.com`
  const password = 'TestPass1!'

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError) {
    fail('create test user', createError.message)
    return
  }

  const userClient = createClient(url, publishableKey)
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password })
  if (signInError) {
    fail('sign in test user', signInError.message)
    await admin.auth.admin.deleteUser(created.user.id)
    return
  }

  const { error: insertError } = await userClient.from('programs').insert({
    title: 'Should Fail',
    level: 'Beginner',
  })

  if (insertError) ok('regular user cannot insert program')
  else fail('regular user cannot insert program', 'insert succeeded unexpectedly')

  await admin.from('profiles').update({ role: 'admin' }).eq('id', created.user.id)

  const { error: adminInsertError } = await userClient.from('programs').insert({
    title: `Admin Program ${Date.now()}`,
    level: 'Beginner',
  })

  if (adminInsertError) fail('admin user can insert program', adminInsertError.message)
  else ok('admin user can insert program')

  await admin.auth.admin.deleteUser(created.user.id)
}

await testCmsStatus()
await testSchemaVersion()
await testNonAdminCannotInsertProgram()

console.log(`\nResult: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
