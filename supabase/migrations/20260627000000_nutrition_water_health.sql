-- Nutrition, Water, Health Logic migration

-- Extend profiles with health metrics
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS weight_kg numeric,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS activity_level text CHECK (
    activity_level IN (
      'sedentary',
      'lightly_active',
      'moderately_active',
      'very_active',
      'extra_active'
    )
  ),
  ADD COLUMN IF NOT EXISTS bmi numeric,
  ADD COLUMN IF NOT EXISTS bmr numeric,
  ADD COLUMN IF NOT EXISTS tdee numeric,
  ADD COLUMN IF NOT EXISTS protein_goal_g int,
  ADD COLUMN IF NOT EXISTS carbs_goal_g int,
  ADD COLUMN IF NOT EXISTS fat_goal_g int,
  ADD COLUMN IF NOT EXISTS water_goal_ml int,
  ADD COLUMN IF NOT EXISTS water_reminder_enabled boolean DEFAULT false;

-- Foods library
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  serving_size text NOT NULL DEFAULT '1 phần',
  calories numeric NOT NULL CHECK (calories >= 0),
  protein_g numeric NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foods_name_idx ON foods USING gin (to_tsvector('simple', name));

-- Meal logs per user per day
CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, meal_type)
);

-- Individual food entries in a meal
CREATE TABLE IF NOT EXISTS meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
  quantity numeric NOT NULL CHECK (quantity > 0),
  calories numeric NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein_g numeric NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g numeric NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g numeric NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend daily water intake with ml
ALTER TABLE daily_water_intake
  ADD COLUMN IF NOT EXISTS water_ml int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS water_goal_ml int NOT NULL DEFAULT 2000;

-- RLS: foods — public read for system foods, users manage own custom foods
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foods_select_all" ON foods;
CREATE POLICY "foods_select_all" ON foods
  FOR SELECT TO authenticated
  USING (is_custom = false OR created_by = auth.uid());

DROP POLICY IF EXISTS "foods_insert_custom" ON foods;
CREATE POLICY "foods_insert_custom" ON foods
  FOR INSERT TO authenticated
  WITH CHECK (is_custom = true AND created_by = auth.uid());

DROP POLICY IF EXISTS "foods_update_own" ON foods;
CREATE POLICY "foods_update_own" ON foods
  FOR UPDATE TO authenticated
  USING (is_custom = true AND created_by = auth.uid());

DROP POLICY IF EXISTS "foods_delete_own" ON foods;
CREATE POLICY "foods_delete_own" ON foods
  FOR DELETE TO authenticated
  USING (is_custom = true AND created_by = auth.uid());

-- RLS: meal_logs
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_logs_select_own" ON meal_logs;
CREATE POLICY "meal_logs_select_own" ON meal_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "meal_logs_insert_own" ON meal_logs;
CREATE POLICY "meal_logs_insert_own" ON meal_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "meal_logs_update_own" ON meal_logs;
CREATE POLICY "meal_logs_update_own" ON meal_logs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "meal_logs_delete_own" ON meal_logs;
CREATE POLICY "meal_logs_delete_own" ON meal_logs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: meal_items via meal_logs ownership
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meal_items_select_own" ON meal_items;
CREATE POLICY "meal_items_select_own" ON meal_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "meal_items_insert_own" ON meal_items;
CREATE POLICY "meal_items_insert_own" ON meal_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "meal_items_update_own" ON meal_items;
CREATE POLICY "meal_items_update_own" ON meal_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "meal_items_delete_own" ON meal_items;
CREATE POLICY "meal_items_delete_own" ON meal_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs ml
      WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()
    )
  );
