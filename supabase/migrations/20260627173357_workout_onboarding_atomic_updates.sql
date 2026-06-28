-- Workout, onboarding, RLS hardening and atomic health updates.
-- Created with: supabase migration new workout_onboarding_atomic_updates

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Core tables referenced by the mobile app
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists date_of_birth date,
  add column if not exists age integer,
  add column if not exists gender text,
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists fitness_goal text,
  add column if not exists activity_level text,
  add column if not exists bmi numeric,
  add column if not exists bmr numeric,
  add column if not exists tdee numeric,
  add column if not exists daily_calorie_goal integer default 2100,
  add column if not exists protein_goal_g integer,
  add column if not exists carbs_goal_g integer,
  add column if not exists fat_goal_g integer,
  add column if not exists water_goal_ml integer default 2000,
  add column if not exists water_reminder_enabled boolean not null default false,
  add column if not exists wakeup_time time not null default '06:30',
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.daily_water_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  water_cups integer not null default 0,
  water_goal integer not null default 8,
  water_ml integer not null default 0,
  water_goal_ml integer not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_water_intake
  add column if not exists water_cups integer not null default 0,
  add column if not exists water_goal integer not null default 8,
  add column if not exists water_ml integer not null default 0,
  add column if not exists water_goal_ml integer not null default 2000,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists daily_water_intake_user_date_uidx
  on public.daily_water_intake (user_id, date);

create table if not exists public.daily_nutrition (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  calories_consumed numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_nutrition
  add column if not exists calories_consumed numeric not null default 0,
  add column if not exists protein_g numeric not null default 0,
  add column if not exists carbs_g numeric not null default 0,
  add column if not exists fat_g numeric not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists daily_nutrition_user_date_uidx
  on public.daily_nutrition (user_id, date);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null default 'Beginner'
    check (level in ('Beginner', 'Intermediate', 'Advanced')),
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  duration integer not null check (duration > 0),
  met_value numeric not null check (met_value > 0),
  media_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.exercises
  add column if not exists media_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

create index if not exists exercises_program_sort_idx
  on public.exercises (program_id, sort_order);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  workout_date date not null,
  calories_burned numeric not null check (calories_burned >= 0),
  created_at timestamptz not null default now()
);

create index if not exists exercise_logs_user_date_idx
  on public.exercise_logs (user_id, workout_date);
create index if not exists exercise_logs_exercise_id_idx
  on public.exercise_logs (exercise_id);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete restrict,
  workout_date date not null,
  total_calories numeric not null default 0 check (total_calories >= 0),
  completed_at timestamptz not null default now(),
  unique (user_id, program_id, workout_date)
);

create index if not exists workout_sessions_user_date_idx
  on public.workout_sessions (user_id, workout_date);
create index if not exists workout_sessions_program_id_idx
  on public.workout_sessions (program_id);

create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_workout_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_streaks
  add column if not exists longest_streak integer not null default 0;

create unique index if not exists user_streaks_user_id_uidx
  on public.user_streaks (user_id);

create table if not exists public.workout_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  total_sessions integer not null check (total_sessions > 0),
  target_muscle text,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.workout_courses(id) on delete cascade,
  completed_sessions integer not null default 0 check (completed_sessions >= 0),
  is_active boolean not null default true,
  started_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists user_courses_user_active_idx
  on public.user_courses (user_id, is_active);
create index if not exists user_courses_course_id_idx
  on public.user_courses (course_id);

-- -----------------------------------------------------------------------------
-- Auth profile bootstrap. This is the only SECURITY DEFINER function here.
-- It is private, has an empty search path and cannot be called by API roles.
-- -----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.daily_water_intake enable row level security;
alter table public.daily_nutrition enable row level security;
alter table public.programs enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.user_streaks enable row level security;
alter table public.workout_courses enable row level security;
alter table public.user_courses enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists daily_water_select_own on public.daily_water_intake;
create policy daily_water_select_own on public.daily_water_intake
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists daily_water_insert_own on public.daily_water_intake;
create policy daily_water_insert_own on public.daily_water_intake
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists daily_water_update_own on public.daily_water_intake;
create policy daily_water_update_own on public.daily_water_intake
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists daily_water_delete_own on public.daily_water_intake;
create policy daily_water_delete_own on public.daily_water_intake
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists daily_nutrition_select_own on public.daily_nutrition;
create policy daily_nutrition_select_own on public.daily_nutrition
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists daily_nutrition_insert_own on public.daily_nutrition;
create policy daily_nutrition_insert_own on public.daily_nutrition
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists daily_nutrition_update_own on public.daily_nutrition;
create policy daily_nutrition_update_own on public.daily_nutrition
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists programs_read_authenticated on public.programs;
create policy programs_read_authenticated on public.programs
  for select to authenticated using (true);
drop policy if exists exercises_read_authenticated on public.exercises;
create policy exercises_read_authenticated on public.exercises
  for select to authenticated using (true);

drop policy if exists exercise_logs_select_own on public.exercise_logs;
create policy exercise_logs_select_own on public.exercise_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists exercise_logs_insert_own on public.exercise_logs;
create policy exercise_logs_insert_own on public.exercise_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists workout_sessions_select_own on public.workout_sessions;
create policy workout_sessions_select_own on public.workout_sessions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists workout_sessions_insert_own on public.workout_sessions;
create policy workout_sessions_insert_own on public.workout_sessions
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists user_streaks_select_own on public.user_streaks;
create policy user_streaks_select_own on public.user_streaks
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_streaks_insert_own on public.user_streaks;
create policy user_streaks_insert_own on public.user_streaks
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_streaks_update_own on public.user_streaks;
create policy user_streaks_update_own on public.user_streaks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_courses_read_authenticated on public.workout_courses;
create policy workout_courses_read_authenticated on public.workout_courses
  for select to authenticated using (true);
drop policy if exists user_courses_select_own on public.user_courses;
create policy user_courses_select_own on public.user_courses
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists user_courses_insert_own on public.user_courses;
create policy user_courses_insert_own on public.user_courses
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists user_courses_update_own on public.user_courses;
create policy user_courses_update_own on public.user_courses
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Harden policies created by the previous nutrition migration.
drop policy if exists foods_select_all on public.foods;
create policy foods_select_all on public.foods
  for select to authenticated
  using (is_custom = false or created_by = (select auth.uid()));
drop policy if exists foods_insert_custom on public.foods;
create policy foods_insert_custom on public.foods
  for insert to authenticated
  with check (is_custom = true and created_by = (select auth.uid()));
drop policy if exists foods_update_own on public.foods;
create policy foods_update_own on public.foods
  for update to authenticated
  using (is_custom = true and created_by = (select auth.uid()))
  with check (is_custom = true and created_by = (select auth.uid()));
drop policy if exists foods_delete_own on public.foods;
create policy foods_delete_own on public.foods
  for delete to authenticated
  using (is_custom = true and created_by = (select auth.uid()));

drop policy if exists meal_logs_select_own on public.meal_logs;
create policy meal_logs_select_own on public.meal_logs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists meal_logs_insert_own on public.meal_logs;
create policy meal_logs_insert_own on public.meal_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists meal_logs_update_own on public.meal_logs;
create policy meal_logs_update_own on public.meal_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists meal_logs_delete_own on public.meal_logs;
create policy meal_logs_delete_own on public.meal_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists meal_items_select_own on public.meal_items;
create policy meal_items_select_own on public.meal_items
  for select to authenticated
  using (exists (
    select 1 from public.meal_logs ml
    where ml.id = meal_items.meal_log_id
      and ml.user_id = (select auth.uid())
  ));
drop policy if exists meal_items_insert_own on public.meal_items;
create policy meal_items_insert_own on public.meal_items
  for insert to authenticated
  with check (exists (
    select 1 from public.meal_logs ml
    where ml.id = meal_items.meal_log_id
      and ml.user_id = (select auth.uid())
  ));
drop policy if exists meal_items_update_own on public.meal_items;
create policy meal_items_update_own on public.meal_items
  for update to authenticated
  using (exists (
    select 1 from public.meal_logs ml
    where ml.id = meal_items.meal_log_id
      and ml.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.meal_logs ml
    where ml.id = meal_items.meal_log_id
      and ml.user_id = (select auth.uid())
  ));
drop policy if exists meal_items_delete_own on public.meal_items;
create policy meal_items_delete_own on public.meal_items
  for delete to authenticated
  using (exists (
    select 1 from public.meal_logs ml
    where ml.id = meal_items.meal_log_id
      and ml.user_id = (select auth.uid())
  ));

create index if not exists foods_created_by_idx on public.foods (created_by);
create index if not exists meal_items_meal_log_id_idx on public.meal_items (meal_log_id);
create index if not exists meal_items_food_id_idx on public.meal_items (food_id);

-- -----------------------------------------------------------------------------
-- Atomic RPCs. All use SECURITY INVOKER so RLS remains enforced.
-- -----------------------------------------------------------------------------

create or replace function public.add_water_intake(
  p_amount_ml integer,
  p_date date,
  p_goal_ml integer
)
returns public.daily_water_intake
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result public.daily_water_intake;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_amount_ml <= 0 or p_goal_ml <= 0 then
    raise exception 'Water amount and goal must be positive' using errcode = '22023';
  end if;

  insert into public.daily_water_intake (
    user_id, date, water_ml, water_goal_ml, water_cups, water_goal
  )
  values (
    v_user_id,
    p_date,
    p_amount_ml,
    p_goal_ml,
    floor(p_amount_ml / 250.0)::integer,
    ceil(p_goal_ml / 250.0)::integer
  )
  on conflict (user_id, date) do update
  set water_ml = public.daily_water_intake.water_ml + excluded.water_ml,
      water_goal_ml = excluded.water_goal_ml,
      water_cups = floor((public.daily_water_intake.water_ml + excluded.water_ml) / 250.0)::integer,
      water_goal = ceil(excluded.water_goal_ml / 250.0)::integer,
      updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.set_daily_water_goal(
  p_goal_ml integer,
  p_date date
)
returns public.daily_water_intake
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_result public.daily_water_intake;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_goal_ml <= 0 then
    raise exception 'Water goal must be positive' using errcode = '22023';
  end if;

  insert into public.daily_water_intake (
    user_id, date, water_ml, water_goal_ml, water_cups, water_goal
  )
  values (v_user_id, p_date, 0, p_goal_ml, 0, ceil(p_goal_ml / 250.0)::integer)
  on conflict (user_id, date) do update
  set water_goal_ml = excluded.water_goal_ml,
      water_goal = ceil(excluded.water_goal_ml / 250.0)::integer,
      updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.add_meal_item_atomic(
  p_date date,
  p_meal_type text,
  p_food_id uuid,
  p_quantity numeric
)
returns public.meal_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_meal_log_id uuid;
  v_food public.foods;
  v_item public.meal_items;
  v_calories numeric;
  v_protein numeric;
  v_carbs numeric;
  v_fat numeric;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive' using errcode = '22023';
  end if;
  if p_meal_type not in ('breakfast', 'lunch', 'dinner', 'snack') then
    raise exception 'Invalid meal type' using errcode = '22023';
  end if;

  select * into v_food
  from public.foods
  where id = p_food_id;
  if not found then
    raise exception 'Food not found' using errcode = 'P0002';
  end if;

  insert into public.meal_logs (user_id, date, meal_type)
  values (v_user_id, p_date, p_meal_type)
  on conflict (user_id, date, meal_type) do nothing;

  select id into v_meal_log_id
  from public.meal_logs
  where user_id = v_user_id and date = p_date and meal_type = p_meal_type;

  v_calories := round(v_food.calories * p_quantity);
  v_protein := round(v_food.protein_g * p_quantity, 1);
  v_carbs := round(v_food.carbs_g * p_quantity, 1);
  v_fat := round(v_food.fat_g * p_quantity, 1);

  insert into public.meal_items (
    meal_log_id, food_id, quantity, calories, protein_g, carbs_g, fat_g
  )
  values (
    v_meal_log_id, p_food_id, p_quantity, v_calories, v_protein, v_carbs, v_fat
  )
  returning * into v_item;

  insert into public.daily_nutrition (
    user_id, date, calories_consumed, protein_g, carbs_g, fat_g
  )
  values (v_user_id, p_date, v_calories, v_protein, v_carbs, v_fat)
  on conflict (user_id, date) do update
  set calories_consumed = public.daily_nutrition.calories_consumed + excluded.calories_consumed,
      protein_g = public.daily_nutrition.protein_g + excluded.protein_g,
      carbs_g = public.daily_nutrition.carbs_g + excluded.carbs_g,
      fat_g = public.daily_nutrition.fat_g + excluded.fat_g,
      updated_at = now();

  return v_item;
end;
$$;

create or replace function public.remove_meal_item_atomic(p_item_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_calories numeric;
  v_protein numeric;
  v_carbs numeric;
  v_fat numeric;
  v_date date;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select mi.calories, mi.protein_g, mi.carbs_g, mi.fat_g, ml.date
  into v_calories, v_protein, v_carbs, v_fat, v_date
  from public.meal_items mi
  join public.meal_logs ml on ml.id = mi.meal_log_id
  where mi.id = p_item_id and ml.user_id = v_user_id
  for update of mi;

  if not found then
    raise exception 'Meal item not found' using errcode = 'P0002';
  end if;

  delete from public.meal_items where id = p_item_id;

  update public.daily_nutrition
  set calories_consumed = greatest(0, calories_consumed - v_calories),
      protein_g = greatest(0, protein_g - v_protein),
      carbs_g = greatest(0, carbs_g - v_carbs),
      fat_g = greatest(0, fat_g - v_fat),
      updated_at = now()
  where user_id = v_user_id and date = v_date;

  return true;
end;
$$;

create or replace function public.complete_workout_session(
  p_program_id uuid,
  p_workout_date date,
  p_total_calories numeric
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_total_calories < 0 then
    raise exception 'Calories cannot be negative' using errcode = '22023';
  end if;

  insert into public.workout_sessions (
    user_id, program_id, workout_date, total_calories
  )
  values (v_user_id, p_program_id, p_workout_date, p_total_calories)
  on conflict (user_id, program_id, workout_date) do nothing;

  insert into public.user_streaks (
    user_id, current_streak, longest_streak, last_workout_date, updated_at
  )
  values (v_user_id, 1, 1, p_workout_date, now())
  on conflict (user_id) do update
  set current_streak = case
        when public.user_streaks.last_workout_date is null then 1
        when excluded.last_workout_date <= public.user_streaks.last_workout_date
          then public.user_streaks.current_streak
        when excluded.last_workout_date = public.user_streaks.last_workout_date + 1
          then public.user_streaks.current_streak + 1
        else 1
      end,
      longest_streak = greatest(
        public.user_streaks.longest_streak,
        case
          when public.user_streaks.last_workout_date is null then 1
          when excluded.last_workout_date <= public.user_streaks.last_workout_date
            then public.user_streaks.current_streak
          when excluded.last_workout_date = public.user_streaks.last_workout_date + 1
            then public.user_streaks.current_streak + 1
          else 1
        end
      ),
      last_workout_date = case
        when public.user_streaks.last_workout_date is null
          or excluded.last_workout_date > public.user_streaks.last_workout_date
        then excluded.last_workout_date
        else public.user_streaks.last_workout_date
      end,
      updated_at = now()
  returning current_streak into v_streak;

  return v_streak;
end;
$$;

-- -----------------------------------------------------------------------------
-- Storage policies for avatars
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Explicit Data API grants are required for new Supabase projects from May 2026.
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.daily_water_intake to authenticated;
grant select, insert, update on public.daily_nutrition to authenticated;
grant select on public.programs, public.exercises, public.workout_courses to authenticated;
grant select, insert on public.exercise_logs, public.workout_sessions to authenticated;
grant select, insert, update on public.user_streaks, public.user_courses to authenticated;
grant select, insert, update, delete on public.foods, public.meal_logs, public.meal_items to authenticated;

revoke all on function public.add_water_intake(integer, date, integer) from public, anon;
revoke all on function public.set_daily_water_goal(integer, date) from public, anon;
revoke all on function public.add_meal_item_atomic(date, text, uuid, numeric) from public, anon;
revoke all on function public.remove_meal_item_atomic(uuid) from public, anon;
revoke all on function public.complete_workout_session(uuid, date, numeric) from public, anon;
grant execute on function public.add_water_intake(integer, date, integer) to authenticated;
grant execute on function public.set_daily_water_goal(integer, date) to authenticated;
grant execute on function public.add_meal_item_atomic(date, text, uuid, numeric) to authenticated;
grant execute on function public.remove_meal_item_atomic(uuid) to authenticated;
grant execute on function public.complete_workout_session(uuid, date, numeric) to authenticated;
