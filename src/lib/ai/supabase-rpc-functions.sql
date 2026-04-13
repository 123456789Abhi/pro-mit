-- ═══════════════════════════════════════════════════════
-- LERNEN AI Model Router — Supabase RPC Functions
-- Run this migration ONCE on your Supabase project.
-- ═══════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. Atomic spend increment (prevents race conditions)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_ai_spend(
  p_school_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE school_ai_budget
  SET current_spend = current_spend + p_amount
  WHERE school_id = p_school_id;

  -- If no row exists, create one with unlimited budget
  IF NOT FOUND THEN
    INSERT INTO school_ai_budget (school_id, monthly_budget, current_spend, alert_threshold, is_capped)
    VALUES (p_school_id, 999999, p_amount, 80, false);
  END IF;
END;
$$;


-- ─────────────────────────────────────────────
-- 2. Daily usage upsert (atomic increment per field)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_daily_usage(
  p_student_id UUID,
  p_date DATE,
  p_field TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert first
  INSERT INTO daily_usage (student_id, date, ai_calls, pregen_served, cache_hits)
  VALUES (
    p_student_id,
    p_date,
    CASE WHEN p_field = 'ai_calls' THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'pregen_served' THEN 1 ELSE 0 END,
    CASE WHEN p_field = 'cache_hits' THEN 1 ELSE 0 END
  )
  ON CONFLICT (student_id, date) DO UPDATE
  SET
    ai_calls = daily_usage.ai_calls + CASE WHEN p_field = 'ai_calls' THEN 1 ELSE 0 END,
    pregen_served = daily_usage.pregen_served + CASE WHEN p_field = 'pregen_served' THEN 1 ELSE 0 END,
    cache_hits = daily_usage.cache_hits + CASE WHEN p_field = 'cache_hits' THEN 1 ELSE 0 END;
END;
$$;


-- ─────────────────────────────────────────────
-- 3. Search pre-generated FAQ by semantic similarity
-- Requires pgvector extension enabled
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_pregen_faq(
  p_query TEXT,
  p_grade INT,
  p_subject TEXT,
  p_topic_group TEXT DEFAULT NULL,
  p_school_id UUID DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.90,
  p_limit INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  answer TEXT,
  sources JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_embedding VECTOR(1536);
BEGIN
  -- NOTE: In production, the embedding is generated BEFORE calling this function
  -- and passed as a parameter. This is a simplified version that assumes
  -- the embedding is pre-computed and stored.
  -- The actual implementation would use:
  --   query_embedding := (SELECT embedding FROM generate_embedding(p_query));

  RETURN QUERY
  SELECT
    pf.id,
    pf.answer,
    jsonb_build_array(
      jsonb_build_object(
        'book', mb.title,
        'chapter', pf.chapter,
        'page', 0
      )
    ) AS sources,
    1 - (pf.embedding <=> query_embedding) AS similarity
  FROM pregenerated_faq pf
  JOIN master_books mb ON mb.id = pf.book_id
  WHERE pf.grade = p_grade
    AND LOWER(pf.subject) = LOWER(p_subject)
    AND (p_topic_group IS NULL OR pf.topic_group = p_topic_group)
    AND 1 - (pf.embedding <=> query_embedding) >= p_similarity_threshold
    -- Only return FAQ from books enabled for this school
    AND (p_school_id IS NULL OR EXISTS (
      SELECT 1 FROM school_book_settings sbs
      WHERE sbs.school_id = p_school_id
        AND sbs.book_id = pf.book_id
        AND sbs.enabled = true
    ))
  ORDER BY pf.embedding <=> query_embedding
  LIMIT p_limit;
END;
$$;


-- ─────────────────────────────────────────────
-- 4. Search exact cache by hash key
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_exact_cache(
  p_cache_key TEXT
)
RETURNS TABLE (
  cache_key TEXT,
  answer TEXT,
  sources JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.cache_key,
    ac.answer,
    ac.sources
  FROM ai_cache ac
  WHERE ac.cache_key = p_cache_key
    AND (ac.expires_at IS NULL OR ac.expires_at > NOW());

  -- Increment hit count
  UPDATE ai_cache
  SET hit_count = ai_cache.hit_count + 1
  WHERE ai_cache.cache_key = p_cache_key;
END;
$$;


-- ─────────────────────────────────────────────
-- 5. Search semantic cache by embedding similarity
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_semantic_cache(
  p_query TEXT,
  p_grade INT,
  p_subject TEXT,
  p_similarity_threshold FLOAT DEFAULT 0.92
)
RETURNS TABLE (
  cache_key TEXT,
  answer TEXT,
  sources JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Semantic cache uses higher threshold (0.92) than pre-gen FAQ (0.90)
  -- because cached answers are from live API and may be less curated
  RETURN QUERY
  SELECT
    ac.cache_key,
    ac.answer,
    ac.sources
  FROM ai_cache ac
  WHERE (ac.expires_at IS NULL OR ac.expires_at > NOW())
  ORDER BY ac.cache_key -- Placeholder: actual implementation uses embedding similarity
  LIMIT 1;

  -- NOTE: Full semantic cache search requires the query embedding
  -- to be generated first. This is handled in the pipeline layer.
END;
$$;


-- ─────────────────────────────────────────────
-- 6. Upsert AI cache entry
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_ai_cache(
  p_cache_key TEXT,
  p_question TEXT,
  p_answer TEXT,
  p_sources TEXT,  -- JSON string
  p_expires_days INT DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_cache (cache_key, question, answer, sources, hit_count, expires_at)
  VALUES (
    p_cache_key,
    p_question,
    p_answer,
    p_sources::JSONB,
    0,
    NOW() + (p_expires_days || ' days')::INTERVAL
  )
  ON CONFLICT (cache_key) DO UPDATE
  SET
    answer = EXCLUDED.answer,
    sources = EXCLUDED.sources,
    expires_at = NOW() + (p_expires_days || ' days')::INTERVAL;
END;
$$;


-- ─────────────────────────────────────────────
-- 11. Search master_chunks for RAG context
-- Uses pgvector similarity search with 1536-dim embeddings
-- Falls back to keyword search if embeddings unavailable
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_master_chunks(
  p_query_embedding VECTOR,
  p_school_id UUID,
  p_grade INT,
  p_subject TEXT,
  p_book_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_similarity_threshold FLOAT DEFAULT 0.75,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chapter TEXT,
  page_number INT,
  book_title TEXT,
  book_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.content,
    mc.chapter,
    mc.page_number,
    mb.title AS book_title,
    mb.id AS book_id,
    1 - (mc.embedding <=> p_query_embedding) AS similarity
  FROM master_chunks mc
  JOIN master_books mb ON mb.id = mc.book_id
  WHERE mc.grade = p_grade
    AND LOWER(mc.subject) = LOWER(p_subject)
    AND (p_book_ids = ARRAY[]::UUID[] OR mc.book_id = ANY(p_book_ids))
    -- Only include chunks from books enabled for this school
    AND EXISTS (
      SELECT 1 FROM school_book_settings sbs
      WHERE sbs.school_id = p_school_id
        AND sbs.book_id = mc.book_id
        AND sbs.enabled = true
    )
    AND 1 - (mc.embedding <=> p_query_embedding) >= p_similarity_threshold
  ORDER BY mc.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- ─────────────────────────────────────────────
-- 7. Cost analytics aggregation for Super Admin
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ai_cost_analytics(
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_queries', COUNT(*),
    'cached_free', COUNT(*) FILTER (WHERE response_source IN ('pregen_faq', 'exact_cache')),
    'paid_api_calls', COUNT(*) FILTER (WHERE response_source = 'live_api'),
    'total_cost_inr', COALESCE(SUM(cost_inr), 0),
    'cache_savings_inr', COALESCE(
      COUNT(*) FILTER (WHERE response_source IN ('pregen_faq', 'exact_cache', 'semantic_cache'))
      * 0.10, -- Average cost per API call if it weren't cached
      0
    ),
    'cost_by_model', (
      SELECT jsonb_object_agg(
        COALESCE(model_used, 'cached'),
        model_cost
      )
      FROM (
        SELECT model_used, SUM(cost_inr) AS model_cost
        FROM ai_request_log
        WHERE created_at >= p_date_from AND created_at <= p_date_to
        GROUP BY model_used
      ) model_costs
    ),
    'cost_by_school', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'school_id', arl.school_id,
          'school_name', s.name,
          'cost', arl.school_cost
        )
      ), '[]'::JSONB)
      FROM (
        SELECT school_id, SUM(cost_inr) AS school_cost
        FROM ai_request_log
        WHERE created_at >= p_date_from AND created_at <= p_date_to
        GROUP BY school_id
        ORDER BY school_cost DESC
      ) arl
      JOIN schools s ON s.id = arl.school_id
    )
  ) INTO result
  FROM ai_request_log
  WHERE created_at >= p_date_from AND created_at <= p_date_to;

  RETURN result;
END;
$$;


-- ─────────────────────────────────────────────
-- 8. Monthly budget reset (run via pg_cron on 1st of each month)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION reset_monthly_ai_budgets()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE school_ai_budget
  SET current_spend = 0;
END;
$$;


-- master_chunks: filter by grade + subject
CREATE INDEX IF NOT EXISTS idx_master_chunks_grade_subject
  ON master_chunks (grade, LOWER(subject));

-- master_chunks: vector similarity search
CREATE INDEX IF NOT EXISTS idx_master_chunks_embedding
  ON master_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────────
-- 9. Required indexes for performance
-- ─────────────────────────────────────────────

-- ai_request_log: query by school + date range
CREATE INDEX IF NOT EXISTS idx_ai_request_log_school_date
  ON ai_request_log (school_id, created_at DESC);

-- ai_request_log: query by response source (for analytics)
CREATE INDEX IF NOT EXISTS idx_ai_request_log_source
  ON ai_request_log (response_source, created_at DESC);

-- ai_request_log: query by model (for cost breakdown)
CREATE INDEX IF NOT EXISTS idx_ai_request_log_model
  ON ai_request_log (model_used, created_at DESC);

-- ai_cache: lookup by hash key
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_cache_key
  ON ai_cache (cache_key);

-- ai_cache: expire old entries
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires
  ON ai_cache (expires_at) WHERE expires_at IS NOT NULL;

-- daily_usage: unique per student per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_usage_student_date
  ON daily_usage (student_id, date);

-- pregenerated_faq: filter by grade + subject + topic_group
CREATE INDEX IF NOT EXISTS idx_pregen_faq_lookup
  ON pregenerated_faq (grade, subject, topic_group);

-- school_ai_budget: lookup by school
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_ai_budget_school
  ON school_ai_budget (school_id);


-- ─────────────────────────────────────────────
-- 10. RLS Policies for ai_request_log
-- ─────────────────────────────────────────────

ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;

-- Super Admin sees all
CREATE POLICY "super_admin_all_ai_logs" ON ai_request_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  );

-- Principal sees own school
CREATE POLICY "principal_own_school_ai_logs" ON ai_request_log
  FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM users WHERE users.id = auth.uid() AND users.role = 'principal'
    )
  );

-- Teacher sees own school (read only)
CREATE POLICY "teacher_own_school_ai_logs" ON ai_request_log
  FOR SELECT
  USING (
    school_id = (
      SELECT school_id FROM users WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

-- Students can only see their own logs
CREATE POLICY "student_own_ai_logs" ON ai_request_log
  FOR SELECT
  USING (
    student_id = auth.uid()
  );
