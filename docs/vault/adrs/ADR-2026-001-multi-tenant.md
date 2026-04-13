---
id: ADR-2026-001
title: Multi-tenant Architecture via school_id
status: accepted
date: 2026-03-01
deciders:
  - Abhimnayu Singh
---

## Context

LERNEN is a B2B multi-tenant platform where each school is an independent tenant. We needed a strategy for complete data isolation between schools.

Previous failures from Aividzy: "grading_queue missing school_id", "student_name was TEXT instead of FK".

## Decision

**Use `school_id` on EVERY database table + Supabase RLS policies.**

- Every table has `school_id` column (UUID, NOT NULL)
- Every query filters by `school_id`
- Supabase RLS policies enforce isolation at database level
- school_id comes from `public.users` table (verified, not from JWT)

## Consequences

### Positive
- Complete data isolation between schools
- Simple query pattern: `.eq("school_id", schoolId)` on every operation
- school_id enforced at DB level — cannot accidentally leak data

### Negative
- school_id must be passed through every function
- Requires discipline: no query can omit school_id
- Migration complexity for existing tables

### Neutral
- Middleware extracts school_id from user session
- school_id is never trusted from client input — always verified server-side

## Enforcement Pattern

```typescript
// WRONG — missing school_id
const { data } = await supabase.from('students').select('*')

// CORRECT — school_id filter on every query
const { data } = await supabase
  .from('students')
  .select('*')
  .eq('school_id', schoolId)
```

## Validation

Use grep to find missing school_id:
```bash
grep -rn "supabase.from" --include="*.ts" | grep -v "school_id"
```

## Related ADRs
- [[adrs/ADR-2026-003-role-enforcement]] (role verification)

## References
- [[specs/super-admin/schools]] (school management)
- CLAUDE.md: "school_id MUST appear on EVERY database query, insert, update, and delete"
