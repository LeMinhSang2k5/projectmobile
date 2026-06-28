-- Dashboard summary support, achievement badges, notification preferences.

alter table public.profiles
  add column if not exists workout_reminder_enabled boolean not null default false,
  add column if not exists badge_notifications_enabled boolean not null default true;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null default 'emoji-events',
  criteria_type text not null,
  criteria_value integer not null default 1,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index if not exists user_badges_user_id_idx on public.user_badges (user_id);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

drop policy if exists badges_read_authenticated on public.badges;
create policy badges_read_authenticated on public.badges
  for select to authenticated using (true);

drop policy if exists user_badges_select_own on public.user_badges;
create policy user_badges_select_own on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_badges_insert_own on public.user_badges;
create policy user_badges_insert_own on public.user_badges
  for insert to authenticated with check ((select auth.uid()) = user_id);

insert into public.badges (code, title, description, icon, criteria_type, criteria_value, sort_order)
values
  ('onboarding_complete', 'Khởi đầu', 'Hoàn thành onboarding lần đầu', 'flag', 'onboarding', 1, 1),
  ('first_workout', 'Buổi tập đầu', 'Hoàn thành buổi tập đầu tiên', 'fitness-center', 'workout_sessions', 1, 2),
  ('streak_3', 'Kiên trì 3 ngày', 'Duy trì chuỗi tập 3 ngày liên tiếp', 'local-fire-department', 'streak', 3, 3),
  ('streak_7', 'Tuần vàng', 'Duy trì chuỗi tập 7 ngày liên tiếp', 'whatshot', 'streak', 7, 4),
  ('streak_30', 'Thép không gỉ', 'Duy trì chuỗi tập 30 ngày liên tiếp', 'military-tech', 'streak', 30, 5),
  ('water_goal', 'Hydration Pro', 'Đạt mục tiêu nước trong một ngày', 'water-drop', 'water_goal_days', 1, 6),
  ('nutrition_goal', 'Dinh dưỡng chuẩn', 'Đạt mục tiêu calo trong một ngày', 'restaurant', 'nutrition_goal_days', 1, 7),
  ('burn_500', 'Đốt cháy', 'Đốt cháy 500+ kcal trong một ngày', 'bolt', 'calories_burned_day', 500, 8)
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  criteria_type = excluded.criteria_type,
  criteria_value = excluded.criteria_value,
  sort_order = excluded.sort_order;

grant select on public.badges to authenticated;
grant select, insert on public.user_badges to authenticated;

create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_today date := current_date;
  v_profile public.profiles%rowtype;
  v_streak integer := 0;
  v_longest_streak integer := 0;
  v_calories_burned_today numeric := 0;
  v_workouts_today integer := 0;
  v_weekly_workouts jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  select coalesce(current_streak, 0), coalesce(longest_streak, 0)
  into v_streak, v_longest_streak
  from public.user_streaks
  where user_id = v_user_id;

  select coalesce(sum(total_calories), 0), count(*)
  into v_calories_burned_today, v_workouts_today
  from public.workout_sessions
  where user_id = v_user_id
    and workout_date = v_today;

  select coalesce(jsonb_agg(jsonb_build_object(
    'date', day::text,
    'workouts', coalesce(ws.count, 0),
    'calories_burned', coalesce(ws.calories, 0)
  ) order by day), '[]'::jsonb)
  into v_weekly_workouts
  from generate_series(v_today - 6, v_today, interval '1 day') as day
  left join lateral (
    select count(*)::integer as count, coalesce(sum(total_calories), 0) as calories
    from public.workout_sessions
    where user_id = v_user_id
      and workout_date = day::date
  ) ws on true;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'current_streak', v_streak,
    'longest_streak', v_longest_streak,
    'calories_burned_today', v_calories_burned_today,
    'workouts_today', v_workouts_today,
    'weekly_workouts', v_weekly_workouts,
    'wakeup_time', v_profile.wakeup_time,
    'water_reminder_enabled', coalesce(v_profile.water_reminder_enabled, false),
    'workout_reminder_enabled', coalesce(v_profile.workout_reminder_enabled, false),
    'badge_notifications_enabled', coalesce(v_profile.badge_notifications_enabled, true)
  );
end;
$$;

revoke all on function public.get_dashboard_summary() from public, anon;
grant execute on function public.get_dashboard_summary() to authenticated;
