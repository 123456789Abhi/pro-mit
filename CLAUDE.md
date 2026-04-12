# LERNEN — Claude Code Master Identity

## Project Identity
- **Name:** Lernen (formerly Aividzy)
- **Type:** B2B AI-powered multi-tenant EdTech SaaS for Indian CBSE schools (Class 6-12)
- **Stack:** Next.js 14 (App Router) + TypeScript Strict + Tailwind CSS + Shadcn/UI + Supabase Pro + Vercel
- **AI Models:** Gemini 2.0 Flash (volume) + Claude Haiku (quizzes) + Claude Sonnet (test papers) + OpenAI Embeddings
- **Target:** Phone-first (70%+ mid-range Android, 4G/3G), <3s page load, <200KB JS bundle

## Architecture Rules (NEVER VIOLATE)
1. **1 unified Next.js app** with role-based routing under `/[role]/*`
2. **Multi-tenant via `school_id`** on EVERY table + Supabase RLS policies
3. **Server Components by default** — `"use client"` ONLY for interactivity
4. **Server Actions for ALL mutations** — no API routes for CRUD
5. **Role from `public.users` table** — NEVER from JWT metadata
6. **`getUser()` NEVER `getSession()`** — session can be spoofed
7. **Admin client NEVER in client-side code** — full DB access in browser = catastrophic
8. **Organized by WORKFLOW not entity** — pages map to what users DO, not database tables
9. **No Settings page** — configs live where they're used
10. **Soft deletes everywhere** — `deleted_at TIMESTAMPTZ` on users, books, notifications

## Panel Architecture
- **Super Admin (6 pages):** Command Center, Schools, Content Pipeline, Communicate, Financials, Operations
- **Principal (TBD):** ~8-10 workflow pages (restructured from 26 entity pages)
- **Teacher (22 pages):** Per spec
- **Student (17 pages):** Per spec
- **Parent (Phase 2):** 8 pages, read-only

## Route Structure
```
/auth/*           — Login, signup, password reset
/super-admin/*    — Super Admin panel
/principal/*      — Principal panel
/teacher/*        — Teacher panel
/student/*        — Student panel
/parent/*         — Parent panel (Phase 2)
```

## Middleware Requirements
- Check role from `public.users` table on EVERY request
- Block cross-role route access (student CANNOT access /principal/*)
- Verify `school_id` matches for multi-tenant isolation
- Check `users.deleted_at IS NULL` (deactivated users blocked)
- Handle expired sessions with redirect to /auth/login

## Coding Standards
- TypeScript strict mode, ZERO `any` types
- Zod schemas for ALL input validation
- Error boundaries at every route segment
- Loading skeletons on every route segment
- One server action file per entity
- Cursor-based pagination for >100 rows
- Optimistic UI with rollback for mutations
- Structured logging with correlation IDs
- No `console.log` in production
- No hardcoded secrets
- Named constants for all magic numbers

## Performance Targets
- <200KB initial JS bundle
- <200ms API response p95
- <50ms database query p95
- <3 second page load

## Pre-Aggregation Tables (for scale)
- `admin_alerts` — computed every 5 minutes by background job
- `school_daily_metrics` — computed at midnight IST
- `school_monthly_costs` — computed on 1st of each month
- Notification delivery counts denormalized on `notifications` table

## AI Model Router
- Routes by grade × subject × query complexity
- Class 6-8: Gemini Flash, max_tokens 400-600
- Class 9-10: Gemini Flash, max_tokens 500-800
- Class 11-12 STEM numericals: Claude Haiku, max_tokens 800-1000
- Quiz generation: always Claude Haiku
- Test papers: always Claude Sonnet
- Definitions: always check pre-gen FAQ first (₹0)

## Notification Module
- Send permissions: SuperAdmin→any, Principal→own school, Teacher→own classes
- In-app only (Phase 1), each role = separate notification
- Class-level targeting (all sections), stream filter for 11-12
- Optimistic locking (version column), idempotent delivery
- Rate limits: Principal 10/day, Teacher 5/day/class
- Scheduled: 15-min lead time, max 90 days, auto-expire paused >90d

## Aividzy Failure Log (NEVER REPEAT)
- ❌ Middleware checked login but NOT cross-role access
- ❌ `grading_queue` missing `school_id`
- ❌ `student_name` was TEXT instead of FK
- ❌ Role stored in JWT metadata instead of `public.users`
- ❌ Using `getSession()` instead of `getUser()`
- ❌ Admin client imported in client-side code
- ❌ RLS added "later" (never)
- ❌ One monolithic `actions.ts`
- ❌ No error boundaries, no loading skeletons

## Seed Data
- School: Oakridge International School, CBSE
- Principal: Ramaprashad Bhattacharya
- 8 teachers, 6 classes (9A/B, 10A/B, 11A Science, 11B Commerce), 30 students
- Demo student: Rahul Sharma (Class 10-A)

## Session & Multi-Window Management (MANDATORY AUTOMATION)

### Problem
Every new Claude Code window = fresh context. No automatic cross-session memory.
Context window: ~200K tokens effective, best at ~100K.

### Solution: 5-Layer Persistence (AUTOMATIC)
```
Layer 1: CLAUDE.md          → Auto-loaded every session (THIS FILE)
Layer 2: MEMORY.md + Files  → Auto-loaded at conversation start
Layer 3: Session Log        → Written at EVERY session end (AUTOMATIC)
Layer 4: Master Session Index → Updated after every session (AUTOMATIC)
Layer 5: Session Aliases    → Named shortcuts via /sessions alias
```

### AUTOMATION RULES (DO AUTOMATICALLY, NO PROMPTING NEEDED)

**At session START:**
1. Read MEMORY.md to know current project state
2. Read master-session-index.md for all-sessions overview
3. Read specific panel spec files as needed

**At session END:**
1. Update master-session-index.md with: what was done, pending, next steps
2. Update the relevant panel spec file if it was finalized
3. Alias the session if significant work was done (`/sessions alias <id> <name>`)

**Pipeline Automation (DO AUTOMATICALLY):**
- Use Agent tool (parallel) for independent tasks
- Use EnterPlanMode for complex features
- Use CronCreate/Delete/List for recurring tasks
- Use EnterWorktree for isolated feature branches
- Use tdd-guide for every new feature
- Use code-reviewer + security-reviewer in parallel after every code write
- Use e2e-runner for critical user flows
- Use /build-fix when build fails
- Use /verify after major milestones

**Session Log Template (write at end of every session):**
```markdown
| YYYY-MM-DD | Panel: [X] | Summary: [what was done] | Next: [what to do next] |
```

### Memory Files Location
`C:\Users\Abhi\.claude\projects\c--Users-Abhi-OneDrive-Desktop-mitosh-pro-mit\memory\`

Key files:
- `MEMORY.md` — Index of all memory files
- `master-session-index.md` — ALL sessions overview (updated every session)
- `multi-window-session-management.md` — Full system design
- `ai-agent-software-development-pipeline.md` — Pipeline framework
- `super-admin-*.md` — Finalized panel specs (4 complete)
- `principal-panel.md` — Pending
- `teacher-panel.md` — Pending
- `student-panel.md` — Pending
