import { withSupabase } from "@supabase/server"

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    // ctx.supabase is an RLS-scoped client based on the user's JWT
    // ctx.supabaseAdmin is an admin client that bypasses RLS
    const { data, error } = await ctx.supabase.from("todos").select()
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    
    return Response.json(data)
  }),
}
