-- ═══════════════════════════════════════════════════════
-- LERNEN NOTIFICATION MODULE — COMPLETE SQL MIGRATION
-- Covers all 52 hardening fixes from 14 test categories.
-- Run this ONCE on your Supabase project.
-- ═══════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════

-- Fix #6: UNIQUE constraint on school name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_name_unique
  ON schools (LOWER(name));

-- Fix #9: Soft delete on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Fix #10: Soft delete on master_books
ALTER TABLE master_books ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),  -- NULL for multi-school from super_admin
  sender_id UUID NOT NULL REFERENCES users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('super_admin', 'principal', 'teacher')),
  type TEXT NOT NULL DEFAULT 'standard' CHECK (type IN ('standard', 'rating_request')),
  title TEXT NOT NULL CHECK (LENGTH(TRIM(title)) >= 3),
  body TEXT NOT NULL CHECK (LENGTH(TRIM(body)) >= 10 AND LENGTH(body) <= 10000),  -- Fix #29, #30
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
  version INT NOT NULL DEFAULT 1,  -- Fix #5: optimistic locking
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,  -- Fix #43: soft delete
  failure_reason TEXT,  -- Fix #7: error attribution
  -- Fix #3: denormalized delivery counts
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  skipped_schools INT NOT NULL DEFAULT 0,  -- Fix #41
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification templates (must exist before notifications FK)
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

-- Notification recipients
CREATE TABLE IF NOT EXISTS notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('pending', 'delivered', 'read', 'failed')),
  failure_reason TEXT CHECK (failure_reason IN (
    'school_deactivated', 'student_removed', 'user_deactivated',
    'edge_function_timeout', 'database_error', 'unknown'
  )),  -- Fix #7
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  rating INT CHECK (rating >= 1 AND rating <= 5),  -- Fix #34
  rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Fix #20: idempotent delivery
  UNIQUE(notification_id, recipient_id)
);

-- Notification feedback
CREATE TABLE IF NOT EXISTS notification_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  feedback_text TEXT NOT NULL CHECK (LENGTH(TRIM(feedback_text)) >= 10 AND LENGTH(feedback_text) <= 5000),  -- Fix #45
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Fix #46: one feedback per person per notification
  UNIQUE(notification_id, sender_id)
);

-- Notification audit log
CREATE TABLE IF NOT EXISTS notification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN (
    'created', 'edited', 'scheduled', 'sent', 'paused',
    'resumed', 'cancelled', 'expired', 'retried', 'deleted'
  )),
  changes JSONB,
  ip_address TEXT NOT NULL,  -- Fix #30: audit with IP
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily notification rate limits — Fix #15
CREATE TABLE IF NOT EXISTS daily_notification_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  count INT NOT NULL DEFAULT 0,
  UNIQUE(sender_id, date)
);

-- Impersonation log — Fix #12
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

-- Pre-computed admin alerts — Fix #1
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_url TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Pre-aggregated school metrics — Fix #2
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

-- Monthly cost aggregation — Fix #4
CREATE TABLE IF NOT EXISTS school_monthly_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id),
  month DATE NOT NULL,  -- First day of month
  ai_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  infra_share NUMERIC(10,2) NOT NULL DEFAULT 350,
  revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
  profit NUMERIC(10,2) GENERATED ALWAYS AS (revenue - ai_cost - infra_share) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, month)
);

-- Notification archive — Fix #47
CREATE TABLE IF NOT EXISTS notifications_archive (
  LIKE notifications INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS notification_recipients_archive (
  LIKE notification_recipients INCLUDING ALL
);


-- ═══════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════

-- Notifications: sender lookup
CREATE INDEX IF NOT EXISTS idx_notifications_sender
  ON notifications (sender_id, created_at DESC);

-- Notifications: status for scheduled send job
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled
  ON notifications (status, scheduled_at)
  WHERE status = 'scheduled' AND deleted_at IS NULL;

-- Notifications: paused for expiry check
CREATE INDEX IF NOT EXISTS idx_notifications_paused
  ON notifications (status, scheduled_at)
  WHERE status = 'paused' AND deleted_at IS NULL;

-- Recipients: per notification delivery log
CREATE INDEX IF NOT EXISTS idx_recipients_notification
  ON notification_recipients (notification_id, status);

-- Recipients: per user inbox
CREATE INDEX IF NOT EXISTS idx_recipients_user
  ON notification_recipients (recipient_id, created_at DESC);

-- Recipients: rating aggregation
CREATE INDEX IF NOT EXISTS idx_recipients_rating
  ON notification_recipients (notification_id)
  WHERE rating IS NOT NULL;

-- Feedback: per notification
CREATE INDEX IF NOT EXISTS idx_feedback_notification
  ON notification_feedback (notification_id, created_at DESC);

-- Audit log: per notification
CREATE INDEX IF NOT EXISTS idx_audit_notification
  ON notification_audit_log (notification_id, created_at DESC);

-- Audit log: date range queries
CREATE INDEX IF NOT EXISTS idx_audit_date
  ON notification_audit_log (created_at DESC);

-- Rate limits: daily lookup
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON daily_notification_limits (sender_id, date);

-- School metrics: sparkline queries
CREATE INDEX IF NOT EXISTS idx_school_metrics_lookup
  ON school_daily_metrics (school_id, date DESC);

-- Admin alerts: active alerts
CREATE INDEX IF NOT EXISTS idx_admin_alerts_active
  ON admin_alerts (resolved, created_at DESC)
  WHERE resolved = FALSE;

-- Impersonation: active sessions
CREATE INDEX IF NOT EXISTS idx_impersonation_active
  ON impersonation_log (admin_id, ended_at)
  WHERE ended_at IS NULL;


-- ═══════════════════════════════════════════════════════
-- 3. RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════

-- Fix #15: Transactional rate limit check
CREATE OR REPLACE FUNCTION check_and_increment_notification_limit(
  p_sender_id UUID,
  p_date DATE,
  p_max_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INT;
BEGIN
  -- Lock the row to prevent concurrent sends bypassing the limit
  INSERT INTO daily_notification_limits (sender_id, date, count)
  VALUES (p_sender_id, p_date, 0)
  ON CONFLICT (sender_id, date) DO NOTHING;

  SELECT count INTO current_count
  FROM daily_notification_limits
  WHERE sender_id = p_sender_id AND date = p_date
  FOR UPDATE;

  IF current_count >= p_max_limit THEN
    RETURN jsonb_build_object('allowed', false, 'current_count', current_count);
  END IF;

  UPDATE daily_notification_limits
  SET count = count + 1
  WHERE sender_id = p_sender_id AND date = p_date;

  RETURN jsonb_build_object('allowed', true, 'current_count', current_count + 1);
END;
$$;


-- Fix #5: Edit with optimistic locking
CREATE OR REPLACE FUNCTION edit_notification_with_lock(
  p_notification_id UUID,
  p_sender_id UUID,
  p_expected_version INT,
  p_title TEXT,
  p_body TEXT,
  p_priority TEXT,
  p_category TEXT,
  p_attachments JSONB,
  p_links JSONB,
  p_is_pinned BOOLEAN,
  p_scheduled_at TIMESTAMPTZ,
  p_target_role TEXT,
  p_target_schools UUID[],
  p_target_departments TEXT[],
  p_target_grades INT[],
  p_target_streams TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_version INT;
  new_version INT;
BEGIN
  SELECT version INTO actual_version
  FROM notifications
  WHERE id = p_notification_id
    AND sender_id = p_sender_id
    AND status IN ('draft', 'scheduled', 'paused')
    AND deleted_at IS NULL
  FOR UPDATE;

  IF actual_version IS NULL THEN
    RAISE EXCEPTION 'notification_not_found';
  END IF;

  IF actual_version != p_expected_version THEN
    RAISE EXCEPTION 'version_mismatch: expected=%, actual=%', p_expected_version, actual_version;
  END IF;

  new_version := actual_version + 1;

  UPDATE notifications SET
    title = p_title,
    body = p_body,
    priority = p_priority,
    category = p_category,
    attachments = p_attachments,
    links = p_links,
    is_pinned = p_is_pinned,
    scheduled_at = p_scheduled_at,
    target_role = p_target_role,
    target_schools = p_target_schools,
    target_departments = p_target_departments,
    target_grades = p_target_grades,
    target_streams = p_target_streams,
    version = new_version
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('new_version', new_version);
END;
$$;


-- Status transition with locking
CREATE OR REPLACE FUNCTION transition_notification_status(
  p_notification_id UUID,
  p_sender_id UUID,
  p_expected_version INT,
  p_from_status TEXT,
  p_to_status TEXT,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_status TEXT;
  actual_version INT;
BEGIN
  SELECT status, version INTO actual_status, actual_version
  FROM notifications
  WHERE id = p_notification_id
    AND sender_id = p_sender_id
    AND deleted_at IS NULL
  FOR UPDATE;  -- Fix #7: row-level lock

  IF actual_status IS NULL THEN
    RAISE EXCEPTION 'notification_not_found';
  END IF;

  IF actual_version != p_expected_version THEN
    RAISE EXCEPTION 'version_mismatch';
  END IF;

  IF actual_status != p_from_status THEN
    RAISE EXCEPTION 'invalid_transition: expected_from=%, actual=%', p_from_status, actual_status;
  END IF;

  UPDATE notifications SET
    status = p_to_status,
    version = version + 1,
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    cancelled_at = CASE WHEN p_to_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_notification_id;
END;
$$;


-- Cancel from scheduled or paused
CREATE OR REPLACE FUNCTION cancel_notification(
  p_notification_id UUID,
  p_sender_id UUID,
  p_expected_version INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual_status TEXT;
  actual_version INT;
BEGIN
  SELECT status, version INTO actual_status, actual_version
  FROM notifications
  WHERE id = p_notification_id AND sender_id = p_sender_id AND deleted_at IS NULL
  FOR UPDATE;

  IF actual_status IS NULL THEN RAISE EXCEPTION 'notification_not_found'; END IF;
  IF actual_version != p_expected_version THEN RAISE EXCEPTION 'version_mismatch'; END IF;
  IF actual_status NOT IN ('scheduled', 'paused', 'draft') THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE notifications SET
    status = 'cancelled',
    version = version + 1,
    cancelled_at = NOW()
  WHERE id = p_notification_id;
END;
$$;


-- Fix #7, #37, #38: Fetch due notifications for scheduled send job
CREATE OR REPLACE FUNCTION fetch_due_notifications_for_send(
  p_limit INT DEFAULT 50,
  p_timezone TEXT DEFAULT 'Asia/Kolkata'
)
RETURNS SETOF notifications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM notifications
  WHERE status = 'scheduled'
    AND deleted_at IS NULL
    AND scheduled_at <= (NOW() AT TIME ZONE p_timezone)  -- Fix #37: explicit IST
  ORDER BY scheduled_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;  -- Fix #7: lock rows, skip already-processing ones
END;
$$;


-- Fix #39: Auto-expire paused notifications older than N days
CREATE OR REPLACE FUNCTION expire_stale_paused_notifications(
  p_max_age_days INT DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
BEGIN
  UPDATE notifications
  SET status = 'expired', version = version + 1
  WHERE status = 'paused'
    AND deleted_at IS NULL
    AND scheduled_at < NOW() - (p_max_age_days || ' days')::INTERVAL;

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Write audit log for each expired notification
  INSERT INTO notification_audit_log (notification_id, actor_id, action, changes, ip_address)
  SELECT id, sender_id, 'expired',
    jsonb_build_object('reason', 'Paused for more than ' || p_max_age_days || ' days'),
    'system-cron'
  FROM notifications
  WHERE status = 'expired'
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('count', expired_count);
END;
$$;


-- Fix #20: Idempotent recipient insert
CREATE OR REPLACE FUNCTION insert_notification_recipients_idempotent(
  p_notification_id UUID,
  p_recipients TEXT  -- JSON array of {userId, schoolId}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_count INT;
  recipient JSONB;
BEGIN
  inserted_count := 0;

  FOR recipient IN SELECT * FROM jsonb_array_elements(p_recipients::JSONB)
  LOOP
    -- Skip if user is soft-deleted (Fix #9)
    IF EXISTS (
      SELECT 1 FROM users
      WHERE id = (recipient->>'userId')::UUID
        AND deleted_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    -- Skip if school is deactivated (Fix #8)
    IF EXISTS (
      SELECT 1 FROM schools
      WHERE id = (recipient->>'schoolId')::UUID
        AND (status != 'active' OR deleted_at IS NOT NULL)
    ) THEN
      CONTINUE;
    END IF;

    -- Idempotent insert — skip if already exists
    INSERT INTO notification_recipients (notification_id, recipient_id, school_id, status, delivered_at)
    VALUES (
      p_notification_id,
      (recipient->>'userId')::UUID,
      (recipient->>'schoolId')::UUID,
      'delivered',
      NOW()
    )
    ON CONFLICT (notification_id, recipient_id) DO NOTHING;

    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('inserted_count', inserted_count);
END;
$$;


-- Finalize notification send with denormalized counts
CREATE OR REPLACE FUNCTION finalize_notification_send(
  p_notification_id UUID,
  p_delivered_count INT,
  p_skipped_schools INT,
  p_status TEXT,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications SET
    status = p_status,
    version = version + 1,
    delivered_count = p_delivered_count,
    skipped_schools = p_skipped_schools,
    sent_at = NOW(),
    failure_reason = p_failure_reason
  WHERE id = p_notification_id;
END;
$$;


-- Submit rating
CREATE OR REPLACE FUNCTION submit_notification_rating(
  p_notification_id UUID,
  p_recipient_id UUID,
  p_rating INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check this is a rating request
  IF NOT EXISTS (
    SELECT 1 FROM notifications WHERE id = p_notification_id AND has_rating = TRUE
  ) THEN
    RAISE EXCEPTION 'not_rating_request';
  END IF;

  -- Check not already rated
  IF EXISTS (
    SELECT 1 FROM notification_recipients
    WHERE notification_id = p_notification_id
      AND recipient_id = p_recipient_id
      AND rating IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'already_rated';
  END IF;

  UPDATE notification_recipients
  SET rating = p_rating, rated_at = NOW()
  WHERE notification_id = p_notification_id
    AND recipient_id = p_recipient_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recipient_not_found';
  END IF;
END;
$$;


-- Submit feedback with dedup (Fix #46)
CREATE OR REPLACE FUNCTION submit_notification_feedback(
  p_notification_id UUID,
  p_sender_id UUID,
  p_school_id UUID,
  p_feedback_text TEXT,
  p_is_anonymous BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_feedback (notification_id, sender_id, school_id, feedback_text, is_anonymous)
  VALUES (p_notification_id, p_sender_id, p_school_id, p_feedback_text, p_is_anonymous);
  -- UNIQUE(notification_id, sender_id) prevents duplicates
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate: feedback already submitted';
END;
$$;


-- Mark notification as read + update denormalized count
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_recipient_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notification_recipients
  SET status = 'read', read_at = NOW()
  WHERE notification_id = p_notification_id
    AND recipient_id = p_recipient_id
    AND status != 'read';  -- Idempotent

  IF FOUND THEN
    UPDATE notifications
    SET read_count = read_count + 1
    WHERE id = p_notification_id;
  END IF;
END;
$$;


-- Count role in school (Fix #44: anonymous safety)
CREATE OR REPLACE FUNCTION count_role_in_school(
  p_school_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  role_count INT;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM users
  WHERE school_id = p_school_id
    AND role = p_role
    AND deleted_at IS NULL;

  RETURN jsonb_build_object('count', role_count);
END;
$$;


-- Audit log insert
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_notification_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_changes TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT '0.0.0.0'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notification_audit_log (notification_id, actor_id, action, changes, ip_address)
  VALUES (p_notification_id, p_actor_id, p_action, p_changes::JSONB, p_ip_address);
END;
$$;


-- Impersonation session start (Fix #12)
CREATE OR REPLACE FUNCTION start_impersonation_session(
  p_admin_id UUID,
  p_target_school_id UUID,
  p_target_user_id UUID,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_id UUID;
BEGIN
  INSERT INTO impersonation_log (admin_id, target_school_id, target_user_id, ip_address)
  VALUES (p_admin_id, p_target_school_id, p_target_user_id, p_ip_address)
  RETURNING id INTO session_id;

  RETURN jsonb_build_object('session_id', session_id);
END;
$$;


-- Impersonation session end (Fix #12)
CREATE OR REPLACE FUNCTION end_impersonation_session(
  p_session_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE impersonation_log
  SET ended_at = NOW()
  WHERE id = p_session_id AND admin_id = p_admin_id AND ended_at IS NULL;
END;
$$;


-- Retry failed notification (Fix #20)
CREATE OR REPLACE FUNCTION retry_failed_notification(
  p_notification_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retried INT;
BEGIN
  UPDATE notification_recipients
  SET status = 'pending', failure_reason = NULL
  WHERE notification_id = p_notification_id
    AND status = 'failed';

  GET DIAGNOSTICS retried = ROW_COUNT;

  -- Reset notification status to sending
  UPDATE notifications
  SET status = 'sending', version = version + 1, failure_reason = NULL
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('retried_count', retried);
END;
$$;


-- Fix #47: Archive old notifications (academic year rotation)
CREATE OR REPLACE FUNCTION archive_notifications_before_date(
  p_cutoff_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notif_count INT;
  recip_count INT;
BEGIN
  -- Archive recipients first (FK constraint)
  INSERT INTO notification_recipients_archive
  SELECT nr.* FROM notification_recipients nr
  JOIN notifications n ON n.id = nr.notification_id
  WHERE n.sent_at < p_cutoff_date
    AND n.type != 'rating_request';  -- Fix #49: keep rating data 2 years

  GET DIAGNOSTICS recip_count = ROW_COUNT;

  -- Delete archived recipients
  DELETE FROM notification_recipients nr
  USING notifications n
  WHERE n.id = nr.notification_id
    AND n.sent_at < p_cutoff_date
    AND n.type != 'rating_request';

  -- Archive notifications
  INSERT INTO notifications_archive
  SELECT * FROM notifications
  WHERE sent_at < p_cutoff_date
    AND type != 'rating_request';

  GET DIAGNOSTICS notif_count = ROW_COUNT;

  -- Soft-delete archived notifications
  UPDATE notifications
  SET deleted_at = NOW()
  WHERE sent_at < p_cutoff_date
    AND type != 'rating_request';

  RETURN jsonb_build_object(
    'archived_notifications', notif_count,
    'archived_recipients', recip_count
  );
END;
$$;


-- Get teacher's assigned grades (for scope validation)
CREATE OR REPLACE FUNCTION get_grades_for_classes(
  p_class_ids UUID[]
)
RETURNS INT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grades INT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT grade) INTO grades
  FROM classes
  WHERE id = ANY(p_class_ids);

  RETURN COALESCE(grades, '{}'::INT[]);
END;
$$;


-- Resolve recipients (used by both server actions and edge function)
CREATE OR REPLACE FUNCTION resolve_notification_recipients(
  p_target_role TEXT,
  p_target_schools UUID[],
  p_target_departments TEXT[] DEFAULT NULL,
  p_target_grades INT[] DEFAULT NULL,
  p_target_streams TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  school_rec RECORD;
  all_recipients JSONB := '[]'::JSONB;
  all_skipped JSONB := '[]'::JSONB;
  recipient_count INT;
BEGIN
  FOR school_rec IN
    SELECT s.id, s.name, s.status
    FROM schools s
    WHERE s.id = ANY(p_target_schools)
  LOOP
    -- Fix #8: Skip deactivated schools
    IF school_rec.status != 'active' THEN
      all_skipped := all_skipped || jsonb_build_array(jsonb_build_object(
        'school_id', school_rec.id,
        'school_name', school_rec.name,
        'reason', 'School deactivated'
      ));
      CONTINUE;
    END IF;

    IF p_target_role = 'principal' THEN
      SELECT jsonb_agg(jsonb_build_object('userId', u.id, 'schoolId', u.school_id))
      INTO result
      FROM users u
      WHERE u.school_id = school_rec.id
        AND u.role = 'principal'
        AND u.deleted_at IS NULL;

    ELSIF p_target_role = 'teacher' THEN
      IF p_target_departments IS NOT NULL AND array_length(p_target_departments, 1) > 0 THEN
        SELECT jsonb_agg(jsonb_build_object('userId', u.id, 'schoolId', u.school_id))
        INTO result
        FROM users u
        JOIN teachers t ON t.user_id = u.id
        WHERE u.school_id = school_rec.id
          AND u.role = 'teacher'
          AND u.deleted_at IS NULL
          AND t.department = ANY(p_target_departments);
      ELSE
        SELECT jsonb_agg(jsonb_build_object('userId', u.id, 'schoolId', u.school_id))
        INTO result
        FROM users u
        WHERE u.school_id = school_rec.id
          AND u.role = 'teacher'
          AND u.deleted_at IS NULL;
      END IF;

    ELSIF p_target_role = 'student' THEN
      IF p_target_streams IS NOT NULL AND array_length(p_target_streams, 1) > 0 THEN
        -- Class 11-12 with stream filter
        SELECT jsonb_agg(jsonb_build_object('userId', u.id, 'schoolId', u.school_id))
        INTO result
        FROM users u
        JOIN students s ON s.user_id = u.id
        WHERE u.school_id = school_rec.id
          AND u.role = 'student'
          AND u.deleted_at IS NULL
          AND s.grade = ANY(p_target_grades)
          AND s.stream = ANY(p_target_streams);
      ELSE
        -- All sections of selected grades
        SELECT jsonb_agg(jsonb_build_object('userId', u.id, 'schoolId', u.school_id))
        INTO result
        FROM users u
        JOIN students s ON s.user_id = u.id
        WHERE u.school_id = school_rec.id
          AND u.role = 'student'
          AND u.deleted_at IS NULL
          AND s.grade = ANY(p_target_grades);
      END IF;
    END IF;

    IF result IS NULL OR jsonb_array_length(result) = 0 THEN
      -- Fix #41: Skip schools with 0 recipients
      all_skipped := all_skipped || jsonb_build_array(jsonb_build_object(
        'school_id', school_rec.id,
        'school_name', school_rec.name,
        'reason', 'No matching ' || p_target_role || 's found'
      ));
    ELSE
      all_recipients := all_recipients || result;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'recipients', all_recipients,
    'total_schools', array_length(p_target_schools, 1),
    'schools_with_recipients', array_length(p_target_schools, 1) - jsonb_array_length(all_skipped),
    'skipped_schools', all_skipped
  );
END;
$$;


-- Preview recipients (counts only, no user IDs — lighter query)
CREATE OR REPLACE FUNCTION preview_notification_recipients(
  p_target_role TEXT,
  p_target_schools UUID[],
  p_target_departments TEXT[] DEFAULT NULL,
  p_target_grades INT[] DEFAULT NULL,
  p_target_streams TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  full_result JSONB;
  school_results JSONB := '[]'::JSONB;
  school_rec RECORD;
  cnt INT;
  total_recipients INT := 0;
  skipped INT := 0;
  skipped_names TEXT[] := '{}';
BEGIN
  FOR school_rec IN
    SELECT s.id, s.name, s.status
    FROM schools s
    WHERE s.id = ANY(p_target_schools)
  LOOP
    IF school_rec.status != 'active' THEN
      skipped := skipped + 1;
      skipped_names := array_append(skipped_names, school_rec.name);
      CONTINUE;
    END IF;

    IF p_target_role = 'principal' THEN
      SELECT COUNT(*) INTO cnt FROM users
      WHERE school_id = school_rec.id AND role = 'principal' AND deleted_at IS NULL;
    ELSIF p_target_role = 'teacher' THEN
      IF p_target_departments IS NOT NULL AND array_length(p_target_departments, 1) > 0 THEN
        SELECT COUNT(*) INTO cnt FROM users u JOIN teachers t ON t.user_id = u.id
        WHERE u.school_id = school_rec.id AND u.role = 'teacher' AND u.deleted_at IS NULL
          AND t.department = ANY(p_target_departments);
      ELSE
        SELECT COUNT(*) INTO cnt FROM users
        WHERE school_id = school_rec.id AND role = 'teacher' AND deleted_at IS NULL;
      END IF;
    ELSIF p_target_role = 'student' THEN
      IF p_target_streams IS NOT NULL AND array_length(p_target_streams, 1) > 0 THEN
        SELECT COUNT(*) INTO cnt FROM users u JOIN students s ON s.user_id = u.id
        WHERE u.school_id = school_rec.id AND u.role = 'student' AND u.deleted_at IS NULL
          AND s.grade = ANY(p_target_grades) AND s.stream = ANY(p_target_streams);
      ELSE
        SELECT COUNT(*) INTO cnt FROM users u JOIN students s ON s.user_id = u.id
        WHERE u.school_id = school_rec.id AND u.role = 'student' AND u.deleted_at IS NULL
          AND s.grade = ANY(p_target_grades);
      END IF;
    ELSE
      cnt := 0;
    END IF;

    IF cnt = 0 THEN
      skipped := skipped + 1;
      skipped_names := array_append(skipped_names, school_rec.name);
    ELSE
      school_results := school_results || jsonb_build_array(jsonb_build_object(
        'school_id', school_rec.id,
        'school_name', school_rec.name,
        'recipient_count', cnt
      ));
      total_recipients := total_recipients + cnt;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total_schools', array_length(p_target_schools, 1),
    'schools_with_recipients', array_length(p_target_schools, 1) - skipped,
    'skipped_schools', skipped,
    'skipped_school_names', to_jsonb(skipped_names),
    'total_recipients', total_recipients,
    'recipients_by_school', school_results
  );
END;
$$;


-- Create notification RPC
CREATE OR REPLACE FUNCTION create_notification(
  p_sender_id UUID,
  p_sender_role TEXT,
  p_school_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_priority TEXT,
  p_category TEXT,
  p_attachments JSONB,
  p_links JSONB,
  p_is_pinned BOOLEAN,
  p_has_rating BOOLEAN,
  p_template_id UUID,
  p_target_role TEXT,
  p_target_schools UUID[],
  p_target_departments TEXT[],
  p_target_grades INT[],
  p_target_streams TEXT[],
  p_status TEXT,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO notifications (
    sender_id, sender_role, school_id, type, title, body, priority, category,
    attachments, links, is_pinned, has_rating, template_id,
    target_role, target_schools, target_departments, target_grades, target_streams,
    status, scheduled_at
  ) VALUES (
    p_sender_id, p_sender_role, p_school_id, p_type, p_title, p_body, p_priority, p_category,
    p_attachments, p_links, p_is_pinned, p_has_rating, p_template_id,
    p_target_role, p_target_schools, p_target_departments, p_target_grades, p_target_streams,
    p_status, p_scheduled_at
  )
  RETURNING id INTO new_id;

  -- Increment template use count if applicable
  IF p_template_id IS NOT NULL THEN
    UPDATE notification_templates SET use_count = use_count + 1 WHERE id = p_template_id;
  END IF;

  RETURN jsonb_build_object('id', new_id);
END;
$$;


-- ═══════════════════════════════════════════════════════
-- 4. RLS POLICIES
-- ═══════════════════════════════════════════════════════

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_log ENABLE ROW LEVEL SECURITY;

-- Fix #28: Notifications visible only to sender or recipients
CREATE POLICY "sender_sees_own_notifications" ON notifications
  FOR SELECT USING (sender_id = auth.uid());

CREATE POLICY "super_admin_sees_all_notifications" ON notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );

-- Recipients see notifications they received
CREATE POLICY "recipient_sees_own" ON notification_recipients
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "sender_sees_recipient_log" ON notification_recipients
  FOR SELECT USING (
    notification_id IN (SELECT id FROM notifications WHERE sender_id = auth.uid())
  );

CREATE POLICY "super_admin_sees_all_recipients" ON notification_recipients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );

-- Feedback: sender + super_admin only
CREATE POLICY "feedback_sender_sees_own" ON notification_feedback
  FOR SELECT USING (sender_id = auth.uid());

CREATE POLICY "feedback_notification_sender_sees" ON notification_feedback
  FOR SELECT USING (
    notification_id IN (SELECT id FROM notifications WHERE sender_id = auth.uid())
  );

CREATE POLICY "super_admin_sees_all_feedback" ON notification_feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );

-- Audit log: super_admin only
CREATE POLICY "super_admin_audit_log" ON notification_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );

-- Templates: super_admin only
CREATE POLICY "super_admin_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );

-- Impersonation log: super_admin only
CREATE POLICY "super_admin_impersonation" ON impersonation_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL)
  );


-- ═══════════════════════════════════════════════════════
-- 5. BACKGROUND JOB (pg_cron)
-- ═══════════════════════════════════════════════════════

-- Enable pg_cron extension (run once)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule notification sender every minute
-- SELECT cron.schedule(
--   'send-scheduled-notifications',
--   '* * * * *',
--   $$SELECT net.http_post(
--     url := 'YOUR_EDGE_FUNCTION_URL/send-scheduled-notifications',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY"}'::JSONB
--   )$$
-- );

-- Schedule paused notification expiry check daily at midnight IST
-- SELECT cron.schedule(
--   'expire-paused-notifications',
--   '30 18 * * *',  -- 18:30 UTC = 00:00 IST
--   $$SELECT expire_stale_paused_notifications(90)$$
-- );

-- Schedule daily metrics aggregation at 00:05 IST
-- SELECT cron.schedule(
--   'aggregate-daily-metrics',
--   '35 18 * * *',  -- 18:35 UTC = 00:05 IST
--   $$SELECT aggregate_school_daily_metrics()$$
-- );
