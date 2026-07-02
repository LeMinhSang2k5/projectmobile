import { withSupabase } from 'npm:@supabase/server'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

const ALLOWED_BUCKETS = new Set(['program-thumbnails', 'exercise-media'])
const ALLOWED_EXTENSIONS = new Set(['gif', 'mp4', 'jpg', 'jpeg', 'png', 'webp'])

type UploadRequest = {
  bucket?: string
  path?: string
  contentType?: string
}

function sanitizePath(path: string): string {
  return path
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/')
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const cors = handleCors(req)
    if (cors) return cors

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }

    const userId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500)
    }

    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'Admin access required' }, 403)
    }

    let payload: UploadRequest
    try {
      payload = await req.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const bucket = payload.bucket?.trim()
    const rawPath = payload.path?.trim()
    const contentType = payload.contentType?.trim() || 'application/octet-stream'

    if (!bucket || !rawPath) {
      return jsonResponse(
        { error: 'bucket and path are required' },
        400,
      )
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return jsonResponse({ error: 'Invalid bucket' }, 400)
    }

    const path = sanitizePath(rawPath)
    if (!path) {
      return jsonResponse({ error: 'Invalid path' }, 400)
    }

    const extension = path.split('.').pop()?.toLowerCase()
    if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
      return jsonResponse(
        {
          error: 'Invalid file extension',
          allowed: [...ALLOWED_EXTENSIONS],
        },
        400,
      )
    }

    const { data, error } = await ctx.supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(path)

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    const { data: publicData } = ctx.supabaseAdmin.storage.from(bucket).getPublicUrl(path)

    return jsonResponse({
      bucket,
      path,
      contentType,
      signedUrl: data.signedUrl,
      token: data.token,
      publicUrl: publicData.publicUrl,
    })
  }),
}
