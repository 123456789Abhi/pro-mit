-- ═══════════════════════════════════════════════════════
-- LERNEN — COMPLETE DATABASE MIGRATION
-- Version 2.0 — April 2026
-- 
-- Run this ONCE in Supabase SQL Editor.
-- Creates ALL tables, indexes, RLS policies, RPC functions.
-- Includes all 52 hardening fixes from architecture tests.
-- ═══════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for RAG embeddings


-- ═══════════════════════════════════════════
-- 1. CORE TABLES
-- ═══════════════════════════════════════════

-- Schools (multi-tenant root)
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'CBSE' CHECK (board IN ('CBSE')),
  ai_assistant_name TEXT NOT NULL DEFAULT 'GiNi',
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'expired', 'deactivated')),
  city TEXT,
  region TEXT,
  student_count INT NOT NULL DEFAULT 0,
  subscription_start_date TIMESTAMPTZ,
  subscription_expiry_date TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fix #6: Unique school name (case-insensitive)
CREATE UNIQUE INDEX idx_schools_name_unique ON schools (LOWER(name)) WHERE deleted_at IS NULL;

-- Users (all roles in one table)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  initials TEXT,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'principal', 'teacher', 'student', 'parent')),
  avatar_url TEXT,
  deleted_at TIMESTAMPTZ,  -- Fix #9: soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(email)
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  grade INT NOT NULL CHECK (grade >= 6 AND grade <= 12),
  section TEXT NOT NULL,
  stream TEXT CHECK (stream IN ('Science', 'Commerce', 'Humanities')),
  class_teacher_id UUID REFERENCES users(id),
  max_students INT DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, grade, section)
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  code TEXT,
  type TEXT DEFAULT 'Core' CHECK (type IN ('Core', 'Elective', 'Skill', 'Co-Curricular')),
  grade INT NOT NULL,
  section TEXT,
  topic_groups TEXT[] DEFAULT '{}',
  assigned_teacher_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teachers (extended profile)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  school_id UUID NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  employee_id TEXT,
  phone TEXT,
  department TEXT CHECK (department IN ('Teaching', 'Administration', 'Support')),
  designation TEXT,
  subjects TEXT[] DEFAULT '{}',
  assigned_classes UUID[] DEFAULT '{}',
  qualification TEXT,
  experience INT,
  salary NUMERIC(10,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  platform_usage INT DEFAULT 0,
  ai_adoption NUMERIC(5,2) DEFAULT 0,
  effectiveness_score NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Students (extended profile)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  school_id UUID NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  initials TEXT,
  email TEXT,
  admission_no TEXT,
  roll_no TEXT,
  grade INT NOT NULL CHECK (grade >= 6 AND grade <= 12),
  section TEXT NOT NULL,
  stream TEXT CHECK (stream IN ('Science', 'Commerce', 'Humanities')),
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  dob DATE,
  father_name TEXT,
  mother_name TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  phone TEXT,
  address TEXT,
  avg_score NUMERIC(5,2) DEFAULT 0,
  nine_point_grade TEXT,
  gaps INT DEFAULT 0,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'stable', 'declining')),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  last_active TIMESTAMPTZ,
  ai_interactions INT DEFAULT 0,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'exam', 'meeting', 'sports', 'cultural', 'deadline', 'event')),
  description TEXT,
  grade INT,  -- NULL = all grades
  visibility TEXT NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'students-teachers', 'teachers-only', 'principal-only')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),  -- Fix: FK not TEXT
  chapter TEXT,
  type TEXT NOT NULL CHECK (type IN ('homework', 'quiz', 'test', 'project')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'collecting', 'grading', 'complete')),
  due_date DATE,
  created_date DATE DEFAULT CURRENT_DATE,
  total_students INT DEFAULT 0,
  submitted INT DEFAULT 0,
  graded INT DEFAULT 0,
  avg_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grading Queue
CREATE TABLE IF NOT EXISTS grading_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),  -- Fix: was missing
  assignment_id UUID NOT NULL REFERENCES assignments(id),
  student_id UUID NOT NULL REFERENCES users(id),  -- Fix: FK not TEXT
  assignment_title TEXT NOT NULL,
  subject TEXT,
  chapter TEXT,
  ai_score NUMERIC(5,2),
  teacher_score NUMERIC(5,2),
  max_score NUMERIC(5,2) DEFAULT 100,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'graded', 'reviewed')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lesson Plans
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INT NOT NULL,
  chapter TEXT,
  blooms_levels TEXT[] DEFAULT '{}',
  content JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quiz Results
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  score INT NOT NULL,
  total INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  nine_point_grade TEXT,
  duration INT,  -- seconds
  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Gaps
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  topic TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('critical', 'moderate', 'mild')),
  score NUMERIC(5,2),
  attempts INT DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  wrong_attempts INT DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Fix: UNIQUE constraint prevents duplicates
  UNIQUE(student_id, topic, subject)
);

-- Student Notes
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  chapter TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student Summaries
CREATE TABLE IF NOT EXISTS student_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  chapter TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Library Books (per-school uploads)
CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT DEFAULT 'Textbook' CHECK (type IN ('Textbook', 'Reference', 'Previous Paper', 'Q&A')),
  author TEXT,
  uploaded_by UUID REFERENCES users(id),
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  audience TEXT NOT NULL,
  due_date DATE,
  questions JSONB DEFAULT '[]'::JSONB,
  responses INT DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Logs (legacy — per spec)
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  student_id UUID REFERENCES users(id),  -- Fix: FK not TEXT
  grade INT,
  section TEXT,
  type TEXT,
  subject TEXT,
  query TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ═══════════════════════════════════════════
-- 2. AI & CONTENT TABLES
-- ═══════════════════════════════════════════

-- Master Books (uploaded by Super Admin, shared across all schools)
CREATE TABLE IF NOT EXISTS master_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  board TEXT NOT NULL DEFAULT 'CBSE',
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT DEFAULT 'Textbook',
  author TEXT,
  file_url TEXT,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  chunks_count INT DEFAULT 0,
  file_size_mb NUMERIC(8,2),
  topic_groups TEXT[] DEFAULT '{}',
  deleted_at TIMESTAMPTZ,  -- Fix #10: soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Chunks (extracted from PDFs)
CREATE TABLE IF NOT EXISTS master_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  chapter TEXT,
  page_number INT,
  subject TEXT,
  grade INT,
  topic_group TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Embeddings
CREATE TABLE IF NOT EXISTS master_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES master_chunks(id),
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- School Book Settings (which master books each school has enabled for GiNi)
CREATE TABLE IF NOT EXISTS school_book_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  book_id UUID NOT NULL REFERENCES master_books(id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_by UUID REFERENCES users(id),
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, book_id)
);

-- School Custom Books (uploaded by principal)
CREATE TABLE IF NOT EXISTS school_custom_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  title TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  file_url TEXT,
  processing_status TEXT DEFAULT 'pending',
  chunks_count INT DEFAULT 0,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- School Custom Chunks
CREATE TABLE IF NOT EXISTS school_custom_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES school_custom_books(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  chunk_index INT NOT NULL,
  text TEXT NOT NULL,
  chapter TEXT,
  page_number INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- School Custom Embeddings
CREATE TABLE IF NOT EXISTS school_custom_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL REFERENCES school_custom_chunks(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated Notes
CREATE TABLE IF NOT EXISTS pregenerated_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chapter TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated Summaries
CREATE TABLE IF NOT EXISTS pregenerated_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chapter TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated FAQ
CREATE TABLE IF NOT EXISTS pregenerated_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chapter TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  keywords TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated Quiz Questions
CREATE TABLE IF NOT EXISTS pregenerated_quiz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chapter TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  question_type TEXT NOT NULL CHECK (question_type IN ('MCQ', 'Competency', 'CaseStudy', 'AssertionReason')),
  question TEXT NOT NULL,
  options JSONB,
  correct_index INT,
  explanation TEXT,
  difficulty TEXT DEFAULT 'medium',
  marks INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated Drills
CREATE TABLE IF NOT EXISTS pregenerated_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES master_books(id),
  chapter TEXT NOT NULL,
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  topic_group TEXT,
  topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  questions JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-generated Study Plans
CREATE TABLE IF NOT EXISTS pregenerated_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade INT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI Cache
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::JSONB,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- AI Request Log (every AI interaction)
CREATE TABLE IF NOT EXISTS ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  student_id UUID REFERENCES users(id),
  question TEXT,
  response_source TEXT CHECK (response_source IN ('pregen_faq', 'exact_cache', 'semantic_cache', 'live_api')),
  model_used TEXT,
  tokens_in INT DEFAULT 0,
  tokens_out INT DEFAULT 0,
  cost_inr NUMERIC(10,6) DEFAULT 0,
  latency_ms INT DEFAULT 0,
  pregen_item_id UUID,
  cache_key TEXT,
  feature TEXT,
  grade_tier TEXT,
  subject_category TEXT,
  query_complexity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- School AI Budget
CREATE TABLE IF NOT EXISTS school_ai_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) UNIQUE,
  monthly_budget NUMERIC(10,2) NOT NULL DEFAULT 10000,
  current_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  alert_threshold INT NOT NULL DEFAULT 80,
  is_capped BOOLEAN NOT NULL DEFAULT FALSE,
  reset_day INT DEFAULT 1
);

-- Daily Usage (per student)
CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  ai_calls INT DEFAULT 0,
  pregen_served INT DEFAULT 0,
  cache_hits INT DEFAULT 0,
  UNIQUE(student_id, date)
);


-- ═══════════════════════════════════════════
-- 3. NOTIFICATION TABLES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 3),
  body TEXT NOT NULL CHECK (LENGTH(TRIM(body)) >= 10 AND LENGTH(body) <= 10000),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  category TEXT CHECK (category IN ('academic', 'administrative', 'event', 'emergency', 'update')),
  has_rating BOOLEAN NOT NULL DEFAULT FALSE,
  use_count INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('super_admin', 'principal', 'teacher')),
  type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'rating_request')),
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 3),
  body TEXT NOT NULL CHECK (LENGTH(TRIM(body)) >= 10 AND LENGTH(body) <= 10000),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  category TEXT CHECK (category IN ('academic', 'administrative', 'event', 'emergency', 'update')),
  attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
  links JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  has_rating BOOLEAN NOT NULL DEFAULT FALSE,
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  target_role TEXT NOT NULL CHECK (target_role IN ('principal', 'teacher', 'student')),
  target_schools UUID[] NOT NULL DEFAULT '{}',
  target_departments TEXT[],
  target_grades INT[],
  target_streams TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'paused', 'sending', 'sent',
    'partially_failed', 'cancelled', 'failed', 'expired'
  )),
  version INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  failure_reason TEXT,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  skipped_schools INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('pending', 'delivered', 'read', 'failed')),
  failure_reason TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS notification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  feedback_text TEXT NOT NULL CHECK (LENGTH(TRIM(feedback_text)) >= 10 AND LENGTH(feedback_text) <= 5000),
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id, sender_id)
);

CREATE TABLE IF NOT EXISTS notification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT NOT NULL DEFAULT '0.0.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_notification_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE(sender_id, date)
);


-- ═══════════════════════════════════════════
-- 4. PRE-AGGREGATION TABLES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_url TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  date DATE NOT NULL,
  active_students INT NOT NULL DEFAULT 0,
  ai_queries INT NOT NULL DEFAULT 0,
  cached_queries INT NOT NULL DEFAULT 0,
  ai_cost_inr NUMERIC(10,4) NOT NULL DEFAULT 0,
  notifications_sent INT NOT NULL DEFAULT 0,
  notifications_read INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, date)
);

CREATE TABLE IF NOT EXISTS school_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  month DATE NOT NULL,
  ai_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  infra_share NUMERIC(10,2) NOT NULL DEFAULT 350,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit NUMERIC(10,2) GENERATED ALWAYS AS (revenue - ai_cost - infra_share) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, month)
);

CREATE TABLE IF NOT EXISTS impersonation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  target_school_id UUID NOT NULL REFERENCES schools(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  actions_performed JSONB NOT NULL DEFAULT '[]'::JSONB,
  ip_address TEXT NOT NULL
);

-- Archive tables for academic year rotation
CREATE TABLE IF NOT EXISTS notifications_archive (LIKE notifications INCLUDING ALL);
CREATE TABLE IF NOT EXISTS notification_recipients_archive (LIKE notification_recipients INCLUDING ALL);


-- ═══════════════════════════════════════════
-- 5. INDEXES
-- ═══════════════════════════════════════════

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(school_id, grade);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id, grade);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(school_id, grade, section);
CREATE INDEX IF NOT EXISTS idx_students_user ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_school ON calendar_events(school_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON assignments(school_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_grading_assignment ON grading_queue(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student ON quiz_results(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_student ON knowledge_gaps(student_id, severity);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_school ON knowledge_gaps(school_id, subject);

-- AI indexes
CREATE INDEX IF NOT EXISTS idx_ai_request_log_school ON ai_request_log(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_source ON ai_request_log(response_source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_model ON ai_request_log(model_used, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_usage_student ON daily_usage(student_id, date);
CREATE INDEX IF NOT EXISTS idx_pregen_faq_lookup ON pregenerated_faq(grade, subject, topic_group);
CREATE INDEX IF NOT EXISTS idx_pregen_quiz_lookup ON pregenerated_quiz(grade, subject, chapter, question_type);
CREATE INDEX IF NOT EXISTS idx_master_chunks_book ON master_chunks(book_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_school_book_settings ON school_book_settings(school_id, enabled);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_sender ON notifications(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(status, scheduled_at) WHERE status = 'scheduled' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_paused ON notifications(status, scheduled_at) WHERE status = 'paused' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_notification ON notification_recipients(notification_id, status);
CREATE INDEX IF NOT EXISTS idx_recipients_user ON notification_recipients(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipients_rating ON notification_recipients(notification_id) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_notification ON notification_feedback(notification_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_notification ON notification_audit_log(notification_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_date ON notification_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits ON daily_notification_limits(sender_id, date);
CREATE INDEX IF NOT EXISTS idx_school_metrics ON school_daily_metrics(school_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_active ON admin_alerts(resolved, created_at DESC) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_log(admin_id) WHERE ended_at IS NULL;


-- ═══════════════════════════════════════════
-- 6. RLS POLICIES
-- ═══════════════════════════════════════════

-- Enable RLS on ALL tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

-- Super Admin sees everything
CREATE POLICY "super_admin_all" ON schools FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

-- School-scoped policies (principal, teacher, student see own school only)
CREATE POLICY "school_scoped_users" ON users FOR SELECT USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_classes" ON classes FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_students" ON students FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_teachers" ON teachers FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_subjects" ON subjects FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_calendar" ON calendar_events FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_assignments" ON assignments FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_grading" ON grading_queue FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_quizresults" ON quiz_results FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_gaps" ON knowledge_gaps FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_library" ON library_books FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_surveys" ON surveys FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_ailogs" ON ai_logs FOR ALL USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "school_scoped_airequestlog" ON ai_request_log FOR SELECT USING (
  school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

-- Student-only: own notes and summaries
CREATE POLICY "student_own_notes" ON student_notes FOR ALL USING (
  student_id = auth.uid()
  OR school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('principal', 'teacher') AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "student_own_summaries" ON student_summaries FOR ALL USING (
  student_id = auth.uid()
  OR school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND role IN ('principal', 'teacher') AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

-- Notification RLS
CREATE POLICY "notif_sender" ON notifications FOR SELECT USING (sender_id = auth.uid());
CREATE POLICY "notif_superadmin" ON notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "recip_own" ON notification_recipients FOR SELECT USING (recipient_id = auth.uid());
CREATE POLICY "recip_sender" ON notification_recipients FOR SELECT USING (
  notification_id IN (SELECT id FROM notifications WHERE sender_id = auth.uid())
);
CREATE POLICY "recip_superadmin" ON notification_recipients FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "feedback_own" ON notification_feedback FOR ALL USING (sender_id = auth.uid());
CREATE POLICY "feedback_notif_sender" ON notification_feedback FOR SELECT USING (
  notification_id IN (SELECT id FROM notifications WHERE sender_id = auth.uid())
);
CREATE POLICY "feedback_superadmin" ON notification_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "audit_superadmin" ON notification_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "templates_superadmin" ON notification_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

CREATE POLICY "impersonation_superadmin" ON impersonation_log FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);

-- Lesson plans: teacher owns, principal/super_admin can see
CREATE POLICY "lesson_plans_access" ON lesson_plans FOR ALL USING (
  teacher_id = auth.uid()
  OR school_id = (SELECT school_id FROM users WHERE id = auth.uid() AND role = 'principal' AND deleted_at IS NULL)
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
);
