---
id: SA-COM-001
title: Communicate (Notifications)
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: []
tags: [notifications, feedback, analytics, templates]
---

# Communicate (Notifications)

## Overview

Full notification lifecycle management with feedback intelligence engine.

## Tabs (5 total)

### Tab 1: Compose
5-step notification creation:
1. **Content**: title, body (rich text), attachments, links, priority, category
2. **Targeting**: role, schools, grades, streams, recipient preview
3. **Rating Request**: 1-5 stars + optional comment
4. **Delivery**: Send Now OR Schedule (15min ahead, max 90 days), pin, auto-expiry
5. **Review & Send**: preview, count, send

### Tab 2: All Notifications
Table with: title, status, priority, category, target, delivered, read, failed, read rate, avg rating
Status: draft → scheduled → sending → sent | partially_failed | failed | cancelled | expired | paused

### Tab 3: Templates
Saved templates with: title, body preview, priority, category, use count, created by
Ranked by performance (best → worst). Auto-recommendations for underperforming templates.

### Tab 4: Feedback (Intelligence Engine)
Auto-classification tags:
- Content Gap, UI/UX Issue, Feature Request, Bug Report
- Syllabus Query, Positive Signal, Negative Signal
- Teacher Adoption, Student Drop-off

Weekly Feedback Summary Card: action required items, top feature requests, engagement metrics

### Tab 5: Analytics
Charts: delivery rate over time, notifications by category/priority/role, read rate by school, rating distribution, sentiment timeline, send time heatmap

School Engagement Score: `(Read Rate × 40%) + (Action Rate × 30%) + (Rating × 30%) × 10`
80+ = Healthy | 50-80 = At-risk | <50 = Critical

## Key Constraints
- Super Admin cannot impersonate as principal/teacher/student
- Rating: 1-5 stars + optional comment
- Reply to feedback: notification to sender only (no escalation)
- Anonymous feedback safety warning when <5 people at school

## Related Specs
- [[specs/super-admin/command-center]] (notification health)
- [[specs/super-admin/schools]] (school targeting)
