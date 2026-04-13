---
id: ADR-2026-002
title: Tech Stack: Next.js 14 + TypeScript + Supabase
status: accepted
date: 2026-03-01
deciders:
  - Abhimnayu Singh
---

## Context

LERNEN targets Indian CBSE schools with phone-first design (<3s page load, <200KB JS bundle). We needed a stack optimized for performance, developer velocity, and multi-tenant SaaS.

## Decision

**Primary Stack:**
- Next.js 14 (App Router) — Server Components by default
- TypeScript Strict Mode — zero `any` types
- Tailwind CSS + Shadcn/UI — consistent design system
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Vercel — deployment

**AI Model Router:**
- Class 6-8: Gemini Flash (400-600 tokens)
- Class 9-10: Gemini Flash (500-800 tokens)
- Class 11-12 STEM numericals: Claude Haiku (800-1000 tokens)
- Quiz generation: Claude Haiku
- Test papers: Claude Sonnet
- Definitions: Pre-gen FAQ first (₹0)

## Consequences

### Positive
- Server Components reduce client JS bundle
- Supabase provides auth, DB, storage, edge functions in one platform
- Zod validation at every API boundary
- Vercel deployment with edge runtime

### Negative
- Supabase is relatively new — some features still maturing
- Edge Functions have cold start latency
- pgvector for embeddings requires careful indexing

### Neutral
- Next.js 14 App Router requires learning curve
- Server Actions are the mutation pattern (not API routes)

## Related ADRs
- [[adrs/ADR-2026-001-multi-tenant]]
- [[adrs/ADR-2026-003-role-enforcement]]

## References
- CLAUDE.md: Architecture Rules
- [[specs/super-admin/command-center]] (AI performance metrics)
