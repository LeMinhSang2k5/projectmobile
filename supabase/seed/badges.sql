-- Additional badges for CMS-managed gamification (idempotent by code)

insert into public.badges (code, title, description, icon, criteria_type, criteria_value, sort_order)
values
  (
    'course_30_complete',
    'Kiên Trì',
    'Hoàn thành khóa tập 30 ngày',
    'military-tech',
    'course_sessions',
    30,
    9
  ),
  (
    'course_60_complete',
    'Thép Không Gỉ',
    'Hoàn thành khóa tập 60 ngày',
    'workspace-premium',
    'course_sessions',
    60,
    10
  ),
  (
    'cms_tester',
    'CMS Pioneer',
    'Huy hiệu demo cho nội dung quản trị qua CMS',
    'admin-panel-settings',
    'manual',
    1,
    99
  )
on conflict (code) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  criteria_type = excluded.criteria_type,
  criteria_value = excluded.criteria_value,
  sort_order = excluded.sort_order;
