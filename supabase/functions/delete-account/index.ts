import { withSupabase } from 'npm:@supabase/server'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

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

    let body: { confirm?: string } = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    if (body.confirm !== 'DELETE') {
      return jsonResponse(
        {
          error: 'Confirmation required',
          hint: 'Send POST body: { "confirm": "DELETE" }',
        },
        400,
      )
    }

    const { error } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ success: true, deleted_user_id: userId })
  }),
}
