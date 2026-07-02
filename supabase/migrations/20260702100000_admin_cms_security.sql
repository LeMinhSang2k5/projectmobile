-- Admin role, CMS RLS policies, and media storage buckets.

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- CMS: admin full access on content tables
drop policy if exists programs_admin_all on public.programs;
create policy programs_admin_all on public.programs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists exercises_admin_all on public.exercises;
create policy exercises_admin_all on public.exercises
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists workout_courses_admin_all on public.workout_courses;
create policy workout_courses_admin_all on public.workout_courses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists badges_admin_all on public.badges;
create policy badges_admin_all on public.badges
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists foods_admin_system on public.foods;
create policy foods_admin_system on public.foods
  for all to authenticated
  using (public.is_admin() and is_custom = false)
  with check (public.is_admin() and is_custom = false);

grant insert, update, delete on public.programs, public.exercises, public.workout_courses to authenticated;
grant insert, update, delete on public.badges to authenticated;

-- Storage buckets for CMS media (public read for app streaming)
insert into storage.buckets (id, name, public)
values
  ('program-thumbnails', 'program-thumbnails', true),
  ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists program_thumbnails_select on storage.objects;
create policy program_thumbnails_select on storage.objects
  for select to authenticated
  using (bucket_id = 'program-thumbnails');

drop policy if exists program_thumbnails_admin_write on storage.objects;
create policy program_thumbnails_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'program-thumbnails' and public.is_admin())
  with check (bucket_id = 'program-thumbnails' and public.is_admin());

drop policy if exists exercise_media_select on storage.objects;
create policy exercise_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'exercise-media');

drop policy if exists exercise_media_admin_write on storage.objects;
create policy exercise_media_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'exercise-media' and public.is_admin())
  with check (bucket_id = 'exercise-media' and public.is_admin());

-- Track CMS schema version for cms-status function
create table if not exists public.cms_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.cms_meta enable row level security;

drop policy if exists cms_meta_read_authenticated on public.cms_meta;
create policy cms_meta_read_authenticated on public.cms_meta
  for select to authenticated using (true);

drop policy if exists cms_meta_admin_write on public.cms_meta;
create policy cms_meta_admin_write on public.cms_meta
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.cms_meta (key, value)
values ('schema_version', '20260702100000')
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

grant select on public.cms_meta to authenticated;
