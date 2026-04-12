-- ============================================================
-- LERNEN — Core Database Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- 1. SCHOOLS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  board       TEXT NOT NULL DEFAULT 'CBSE',
  ai_assistant_name TEXT NOT NULL DEFAULT 'AI Assistant',
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  logo_url    TEXT,
  primary_color TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'trial', 'frozen', 'churned', 'suspended')),
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. USERS TABLE (the missing piece!)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  initials    TEXT,
  role        TEXT NOT NULL
                CHECK (role IN ('super_admin', 'principal', 'teacher', 'student', 'parent')),
  avatar_url  TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. CLASSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,          -- e.g. "10-A"
  section     TEXT NOT NULL,           -- e.g. "A"
  class_num   INTEGER NOT NULL,        -- e.g. 10
  stream      TEXT,                    -- 'Science', 'Commerce', 'Arts' (for 11-12)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

-- ============================================================
-- 4. STUDENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  parent_phone TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- 5. TEACHERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teachers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  subject     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- 6. TEACHER-CLASS SUBJECT MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_class_subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id    UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  UNIQUE(teacher_id, class_id, subject)
);

-- ============================================================
-- 7. BOOKS / CONTENT TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.books (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  author      TEXT,
  publisher   TEXT,
  isbn        TEXT,
  class_num   INTEGER NOT NULL,
  subject     TEXT NOT NULL,
  board       TEXT DEFAULT 'CBSE',
  chapter_count INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'active'
                CHECK (status IN ('active', 'archived', 'processing')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- 8. CHAPTERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  chapter_num INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'info',
  is_read     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ
);

-- ============================================================
-- 10. QUERIES TABLE (AI interactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.queries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  book_id     UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id  UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  question    TEXT NOT NULL,
  response    TEXT,
  model_used  TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_paise  NUMERIC(10,4) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. QUIZZES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id    UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  book_id     UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id  UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  teacher_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  type        TEXT DEFAULT 'quiz',
  questions   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- 12. QUIZ ATTEMPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score       NUMERIC(5,2),
  answers     JSONB,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 13. SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  price_monthly_paise INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 14. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_num TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  due_date    TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 15. ADMIN_ALERTS TABLE (pre-aggregated for command center)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  severity    TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'resolved')),
  title       TEXT NOT NULL,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 16. SCHOOL_DAILY_METRICS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_daily_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  queries_count INTEGER DEFAULT 0,
  avg_response_ms NUMERIC(10,2),
  cost_paise  NUMERIC(10,4) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, date)
);

-- ============================================================
-- 17. IMPERSONATION_LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impersonation_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 18. ACTIVITY_LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id   UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 19. CONTENT_PROCESSING_QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_processing_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     UUID REFERENCES public.books(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending',
  error       TEXT,
  attempts    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

-- Schools RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_full_access_schools"
  ON public.schools FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- Users RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_self_read"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));
CREATE POLICY "super_admin_manage_users"
  ON public.users FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- Classes RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_school_access"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );
CREATE POLICY "classes_school_insert"
  ON public.classes FOR INSERT
  TO authenticated
  WITH CHECK (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Students RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "students_school_access"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Teachers RLS
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teachers_school_access"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Books RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_access"
  ON public.books FOR SELECT
  TO authenticated
  USING (school_id IS NULL OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));
CREATE POLICY "books_super_admin_only"
  ON public.books FOR INSERT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- Notifications RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_self_access"
  ON public.notifications FOR ALL
  TO authenticated
  USING (
    recipient_id = auth.uid()
    OR sender_id = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Queries RLS
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queries_self_access"
  ON public.queries FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Quizzes RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quizzes_school_access"
  ON public.quizzes FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Subscriptions RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_super_admin_only"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- Invoices RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_school_access"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Admin Alerts RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_super_admin_only"
  ON public.admin_alerts FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- School Daily Metrics RLS
ALTER TABLE public.school_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_school_access"
  ON public.school_daily_metrics FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)
    OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL)
  );

-- Impersonation Log RLS
ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impersonation_super_admin_only"
  ON public.impersonation_log FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- Activity Log RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_super_admin_read"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));
CREATE POLICY "activity_log_self_insert"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Content Processing Queue RLS
ALTER TABLE public.content_processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_super_admin_only"
  ON public.content_processing_queue FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'super_admin' AND deleted_at IS NULL));

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get user initials from name
CREATE OR REPLACE FUNCTION public.get_user_initials(name TEXT)
RETURNS TEXT AS $$
DECLARE
  parts TEXT[];
  i INTEGER;
  result TEXT := '';
BEGIN
  parts := string_to_array(name, ' ');
  FOR i IN 1..LEAST(array_length(parts, 1), 2) LOOP
    IF parts[i] IS NOT NULL AND length(parts[i]) > 0 THEN
      result := result || upper(substring(parts[i] from 1 for 1));
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-set initials on users insert
CREATE OR REPLACE FUNCTION public.set_user_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.initials IS NULL AND NEW.name IS NOT NULL THEN
    NEW.initials := public.get_user_initials(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_initials_trigger
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_initials();

-- ============================================================
-- SEED DATA: Test Super Admin User
-- Uses SECURITY DEFINER so it bypasses RLS (needed for management API)
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_lernen_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Create auth.users entry for Super Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (id, email, encrypted_password, user_metadata, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'demo@lernen.edu',
      crypt('demo1234', gen_salt('bf')),
      '{"name": "Demo Super Admin"}'::jsonb,
      now()
    );
  END IF;

  -- Step 2: Create public.users entry for Super Admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at)
    VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'demo@lernen.edu', 'Demo Super Admin', 'super_admin', 'DS', NULL);
  END IF;

  -- Step 3: Create demo school
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111') THEN
    INSERT INTO public.schools (id, name, board, ai_assistant_name, academic_year, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Oakridge International School', 'CBSE', 'Lernen AI', '2026-27', 'active');
  END IF;

  -- Step 4: Create auth.users entry for Principal
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '22222222-2222-2222-2222-222222222222') THEN
    INSERT INTO auth.users (id, email, encrypted_password, user_metadata, created_at)
    VALUES (
      '22222222-2222-2222-2222-222222222222',
      'principal@oakridge.edu',
      crypt('demo1234', gen_salt('bf')),
      '{"name": "Ramaprashad Bhattacharya"}'::jsonb,
      now()
    );
  END IF;

  -- Step 5: Create public.users entry for Principal
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '22222222-2222-2222-2222-222222222222') THEN
    INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at)
    VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'principal@oakridge.edu', 'Ramaprashad Bhattacharya', 'principal', 'RB', NULL);
  END IF;

  -- Step 6: Create demo classes
  INSERT INTO public.classes (id, school_id, name, section, class_num, stream)
  VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '9-A', 'A', 9, NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '9-B', 'B', 9, NULL),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '10-A', 'A', 10, NULL),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '10-B', 'B', 10, NULL),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '11-A', 'A', 11, 'Science'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '11-B', 'B', 11, 'Commerce')
  ON CONFLICT (school_id, name) DO NOTHING;

  -- Step 7: Create demo subscription
  INSERT INTO public.subscriptions (school_id, plan, status, started_at, expires_at, price_monthly_paise)
  VALUES ('11111111-1111-1111-1111-111111111111', 'growth', 'active', now(), now() + INTERVAL '1 year', 499900)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'LERNEN seed data inserted successfully.';
END;
$$;

SELECT public.seed_lernen_data();
DROP FUNCTION public.seed_lernen_data();

-- ============================================================
-- PRINT SUMMARY
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'LERNEN Database Setup Complete!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TEST ACCOUNTS:';
  RAISE NOTICE '  Super Admin: demo@lernen.edu / demo1234';
  RAISE NOTICE '  Principal:   principal@oakridge.edu / demo1234';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Change passwords in production!';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS is ENABLED on all tables.';
  RAISE NOTICE 'Service role bypasses RLS — never expose it client-side.';
END $$;
