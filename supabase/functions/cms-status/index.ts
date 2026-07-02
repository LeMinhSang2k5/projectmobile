import { withSupabase } from 'npm:@supabase/server'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

export default {
  fetch: withSupabase({ auth: 'publishable' }, async (req, ctx) => {
    const cors = handleCors(req)
    if (cors) return cors

    const startedAt = Date.now()

    const [
      programs,
      exercises,
      foods,
      badges,
      cmsMeta,
      buckets,
    ] = await Promise.all([
      ctx.supabase.from('programs').select('id', { count: 'exact', head: true }),
      ctx.supabase.from('exercises').select('id', { count: 'exact', head: true }),
      ctx.supabase.from('foods').select('id', { count: 'exact', head: true }).eq('is_custom', false),
      ctx.supabase.from('badges').select('id', { count: 'exact', head: true }),
      ctx.supabase.from('cms_meta').select('key, value, updated_at').eq('key', 'schema_version').maybeSingle(),
      ctx.supabaseAdmin.storage.listBuckets(),
    ])

    const checks = {
      database: !programs.error && !exercises.error && !foods.error && !badges.error,
      storage: !buckets.error,
      cms_meta: !cmsMeta.error,
    }

    const healthy = Object.values(checks).every(Boolean)

    return jsonResponse(
      {
        status: healthy ? 'ok' : 'degraded',
        service: 'fitlife-cms',
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - startedAt,
        schema_version: cmsMeta.data?.value ?? 'unknown',
        counts: {
          programs: programs.count ?? 0,
          exercises: exercises.count ?? 0,
          system_foods: foods.count ?? 0,
          badges: badges.count ?? 0,
        },
        storage_buckets: (buckets.data ?? []).map((b) => b.name),
        checks,
        errors: [
          programs.error?.message,
          exercises.error?.message,
          foods.error?.message,
          badges.error?.message,
          cmsMeta.error?.message,
          buckets.error?.message,
        ].filter(Boolean),
      },
      healthy ? 200 : 503,
    )
  }),
}
