---
id: SA-CP-001
title: Content Pipeline
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: []
tags: [content, pipeline, books, pre-gen, ncert]
---

# Content Pipeline

## Overview

Full content lifecycle management for CBSE NCERT books. Super Admin only uploads content.

## Tabs (7 total)

### Tab 1: Content Library
All master books with: class, subject, book title, medium, status

### Tab 2: Upload
PDF upload → Supabase Storage → Edge Function auto-triggers processing

### Tab 3: Processing Queue
Jobs in progress with stages: Extract → Chunk → Embed (pgvector)

### Tab 4: Pre-gen Content
Manual trigger per book: Notes → FAQ → Summaries → Quizzes → Drills

### Tab 5: Coverage Report
Supply side: what's available vs missing. Thresholds: <20% Critical, 20-50% Warning, 50-99% Acceptable, 100% Complete

### Tab 6: Usage Analytics
Demand side: what's being used, engagement metrics

### Tab 7: Archived Books
Soft-deleted/replaced editions

## CBSE NCERT Book Catalog (Session 2026-27)

### Class 6-8: New Syllabus (NEP 2020)
- Books: Poorvi, Malhar, Ganita Prakash, Curiosity, Exploring Society, Deepakam, Kriti, Khel Yatra, Kaushal Bodh, Khayal

### Class 9: Transitioning (dual catalog)
NEW books: Kaveri (English), Kshitij/Kritika (Hindi A), Sparsh/Sanchayan (Hindi B)
OLD books: Beehive, Moments (existing)

### Class 10-12: Rationalized Syllabus
Standard CBSE books per stream (Science/Commerce/Humanities)

## Key Rules
- Only Super Admin uploads content (Principal cannot upload)
- Dual-catalog for Class 9 during transition
- Pre-gen order: Notes → FAQ → Summaries → Quizzes → Drills
- Versioning: archive old on re-upload

## Related Specs
- [[specs/super-admin/command-center]] (pipeline health metrics)
