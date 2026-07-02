-- Seed workout courses for CMS demo (idempotent by title)

insert into public.workout_courses (title, total_sessions, target_muscle, difficulty, description)
select v.title, v.total_sessions, v.target_muscle, v.difficulty, v.description
from (
  values
    (
      'Thử thách 30 ngày',
      30,
      'full_body',
      'beginner',
      'Lộ trình khởi động 30 ngày cho người mới bắt đầu.'
    ),
    (
      'Khóa tập 60 ngày',
      60,
      'full_body',
      'intermediate',
      'Nâng cao sức mạnh và sức bền trong 2 tháng.'
    ),
    (
      'Phục hồi 12 tuần',
      84,
      'mobility',
      'beginner',
      'Lộ trình phục hồi nhẹ nhàng sau chấn thương hoặc nghỉ tập lâu.'
    )
) as v(title, total_sessions, target_muscle, difficulty, description)
where not exists (
  select 1 from public.workout_courses wc where wc.title = v.title
);

-- Sample program managed via CMS (skip if title exists)
do $$
declare
  prog_id uuid;
begin
  if not exists (
    select 1 from public.programs where title = 'CMS Demo - Core Strength'
  ) then
    insert into public.programs (title, description, level, thumbnail_url)
    values (
      'CMS Demo - Core Strength',
      'Chương trình mẫu do admin quản lý qua CMS.',
      'Beginner',
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b'
    )
    returning id into prog_id;

    insert into public.exercises (program_id, name, duration, met_value, media_url, sort_order)
    values
      (prog_id, 'Plank', 45, 3.5, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 1),
      (prog_id, 'Dead Bug', 45, 3.0, 'https://i.giphy.com/3o7TKMGpxVfFzU8f9S.gif', 2);
  end if;
end $$;
