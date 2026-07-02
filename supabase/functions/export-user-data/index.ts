import { withSupabase } from 'npm:@supabase/server'
import { handleCors, jsonResponse } from '../_shared/cors.ts'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const cors = handleCors(req)
    if (cors) return cors

    const userId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub
    if (!userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const [
      profile,
      workoutSessions,
      exerciseLogs,
      mealLogs,
      dailyNutrition,
      dailyWater,
      userBadges,
      userCourses,
      userStreaks,
    ] = await Promise.all([
      ctx.supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ctx.supabase.from('workout_sessions').select('*').eq('user_id', userId),
      ctx.supabase.from('exercise_logs').select('*').eq('user_id', userId),
      ctx.supabase.from('meal_logs').select('*').eq('user_id', userId),
      ctx.supabase.from('daily_nutrition').select('*').eq('user_id', userId),
      ctx.supabase.from('daily_water_intake').select('*').eq('user_id', userId),
      ctx.supabase.from('user_badges').select('*').eq('user_id', userId),
      ctx.supabase.from('user_courses').select('*').eq('user_id', userId),
      ctx.supabase.from('user_streaks').select('*').eq('user_id', userId),
    ])

    const errors = [
      profile.error,
      workoutSessions.error,
      exerciseLogs.error,
      mealLogs.error,
      dailyNutrition.error,
      dailyWater.error,
      userBadges.error,
      userCourses.error,
      userStreaks.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      return jsonResponse(
        { error: errors[0]?.message ?? 'Failed to export user data' },
        500,
      )
    }

    return jsonResponse({
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data,
      workout_sessions: workoutSessions.data ?? [],
      exercise_logs: exerciseLogs.data ?? [],
      meal_logs: mealLogs.data ?? [],
      daily_nutrition: dailyNutrition.data ?? [],
      daily_water_intake: dailyWater.data ?? [],
      user_badges: userBadges.data ?? [],
      user_courses: userCourses.data ?? [],
      user_streaks: userStreaks.data ?? [],
    })
  }),
}
