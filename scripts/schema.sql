-- LERNEN Core Database Schema
-- Execute via Supabase Management API

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cleanup auth.users seed accounts (so re-runs work cleanly)
DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');

-- Cleanup
DROP TABLE IF EXISTS public.content_processing_queue CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.impersonation_log CASCADE;
DROP TABLE IF EXISTS public.school_daily_metrics CASCADE;
DROP TABLE IF EXISTS public.admin_alerts CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.queries CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.chapters CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;
DROP TABLE IF EXISTS public.teacher_class_subjects CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;
DROP FUNCTION IF EXISTS public.get_user_initials(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_initials() CASCADE;
DROP FUNCTION IF EXISTS public.seed_lernen_data() CASCADE;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'CBSE',
  ai_assistant_name TEXT NOT NULL DEFAULT 'AI Assistant',
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  logo_url TEXT,
  primary_color TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT,
  role TEXT NOT NULL,
  avatar_url TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section TEXT NOT NULL,
  class_num INTEGER NOT NULL,
  stream TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  parent_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.teacher_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  UNIQUE(teacher_id, class_id, subject)
);

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  isbn TEXT,
  class_num INTEGER NOT NULL,
  subject TEXT NOT NULL,
  board TEXT DEFAULT 'CBSE',
  chapter_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  chapter_num INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  response TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_paise NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'quiz',
  questions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  answers JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  price_monthly_paise INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  invoice_num TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE public.school_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  queries_count INTEGER DEFAULT 0,
  avg_response_ms NUMERIC(10,2),
  cost_paise NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(school_id, date)
);

CREATE TABLE public.impersonation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.content_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_processing_queue ENABLE ROW LEVEL SECURITY;

-- Schools
CREATE POLICY schools_all ON public.schools FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Users (uses is_super_admin() to avoid RLS infinite recursion)
CREATE POLICY users_self ON public.users FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_super_admin(auth.uid()));
CREATE POLICY users_all ON public.users FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Classes
CREATE POLICY classes_sel ON public.classes FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY classes_ins ON public.classes FOR INSERT TO authenticated WITH CHECK (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY classes_upd ON public.classes FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY classes_del ON public.classes FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Students
CREATE POLICY students_sel ON public.students FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY students_ins ON public.students FOR INSERT TO authenticated WITH CHECK (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY students_upd ON public.students FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Teachers
CREATE POLICY teachers_sel ON public.teachers FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY teachers_ins ON public.teachers FOR INSERT TO authenticated WITH CHECK (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));

-- Teacher-Class-Subjects
CREATE POLICY tcs_sel ON public.teacher_class_subjects FOR SELECT TO authenticated USING (teacher_id IN (SELECT id FROM public.teachers WHERE school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL)) OR public.is_super_admin(auth.uid()));

-- Books
CREATE POLICY books_sel ON public.books FOR SELECT TO authenticated USING (school_id IS NULL OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY books_ins ON public.books FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

-- Chapters
CREATE POLICY chapters_sel ON public.chapters FOR SELECT TO authenticated USING (book_id IN (SELECT id FROM public.books WHERE school_id IS NULL OR school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid())));

-- Notifications
CREATE POLICY notifs_all ON public.notifications FOR ALL TO authenticated USING (recipient_id = auth.uid() OR sender_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Queries
CREATE POLICY queries_sel ON public.queries FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY queries_ins ON public.queries FOR INSERT TO authenticated WITH CHECK (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));

-- Quizzes
CREATE POLICY quizzes_sel ON public.quizzes FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));
CREATE POLICY quizzes_ins ON public.quizzes FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));

-- Quiz Attempts
CREATE POLICY qattempts_all ON public.quiz_attempts FOR ALL TO authenticated USING (student_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Subscriptions
CREATE POLICY subs_all ON public.subscriptions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Invoices
CREATE POLICY invoices_sel ON public.invoices FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));

-- Admin Alerts
CREATE POLICY alerts_all ON public.admin_alerts FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- School Daily Metrics
CREATE POLICY metrics_sel ON public.school_daily_metrics FOR SELECT TO authenticated USING (school_id = (SELECT school_id FROM public.users WHERE id = auth.uid() AND deleted_at IS NULL) OR public.is_super_admin(auth.uid()));

-- Impersonation Log
CREATE POLICY imperson_all ON public.impersonation_log FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Activity Log
CREATE POLICY activity_sel ON public.activity_log FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY activity_ins ON public.activity_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Content Processing Queue
CREATE POLICY queue_all ON public.content_processing_queue FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- SECURITY DEFINER helper to check super_admin role without RLS recursion
-- This bypasses RLS so subqueries in RLS policies don't cause infinite recursion
CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_uuid
    AND role = 'super_admin'
    AND deleted_at IS NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_initials(name TEXT)
RETURNS TEXT AS $$
DECLARE parts TEXT[]; i INTEGER; result TEXT := '';
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
-- SEED DATA (all inline, single DO block, no blank lines)
-- ============================================================
DO $$
BEGIN
-- Demo school
IF NOT EXISTS (SELECT 1 FROM public.schools WHERE id = '11111111-1111-1111-1111-111111111111') THEN INSERT INTO public.schools (id, name, board, ai_assistant_name, academic_year, status) VALUES ('11111111-1111-1111-1111-111111111111', 'Oakridge International School', 'CBSE', 'Lernen AI', '2026-27', 'active'); END IF;
-- Super Admin auth user
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN INSERT INTO auth.users (id, email, encrypted_password, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'demo@lernen.edu', crypt('demo1234', gen_salt('bf')), now()); END IF;
-- Super Admin public user
IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at) VALUES ('00000000-0000-0000-0000-000000000001', NULL, 'demo@lernen.edu', 'Demo Super Admin', 'super_admin', 'DS', NULL); END IF;
-- Principal auth user
IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '22222222-2222-2222-2222-222222222222') THEN INSERT INTO auth.users (id, email, encrypted_password, created_at) VALUES ('22222222-2222-2222-2222-222222222222', 'principal@oakridge.edu', crypt('demo1234', gen_salt('bf')), now()); END IF;
-- Principal public user
IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = '22222222-2222-2222-2222-222222222222') THEN INSERT INTO public.users (id, school_id, email, name, role, initials, deleted_at) VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'principal@oakridge.edu', 'Ramaprashad Bhattacharya', 'principal', 'RB', NULL); END IF;
-- Demo classes
INSERT INTO public.classes (id, school_id, name, section, class_num, stream) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '9-A', 'A', 9, NULL), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '9-B', 'B', 9, NULL), ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '10-A', 'A', 10, NULL), ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '10-B', 'B', 10, NULL), ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', '11-A', 'A', 11, 'Science'), ('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '11-B', 'B', 11, 'Commerce');
-- Demo subscription
INSERT INTO public.subscriptions (id, school_id, plan, status, started_at, expires_at, price_monthly_paise) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccc', '11111111-1111-1111-1111-111111111111', 'growth', 'active', now(), now() + INTERVAL '1 year', 499900);
RAISE NOTICE 'LERNEN seed data complete.';
END;
$$;
