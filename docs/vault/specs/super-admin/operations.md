---
id: SA-OPS-001
title: Operations
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: []
tags: [operations, alerts, audit, impersonation, health]
---

# Operations

## Overview

System operations: alerts, impersonation logging, audit trail, admin management, health monitoring.

## Tabs (5 total)

### Tab 1: System Alerts
30 auto-generated alert types from background jobs (every 5 min) + manual creation
Severity: Critical (immediate), High (1hr), Medium (4hr), Low (24hr)
Resolution: mark resolved + note, archived after 30 days

### Tab 2: Impersonation Log
Active sessions + full history
Action timeline (JSON): every action performed during impersonation
Security alerts: sessions >2 hours, unusual IPs
Auto-expire: 30 min inactivity → session closes

### Tab 3: Activity Audit Log
Platform-wide action trail with visual diff on changes
Filters: admin, action type, entity type, school, date range, severity
7-year retention (GDPR compliant)
Sensitive actions: edit pricing, deactivate school, start impersonation, create/delete admin

### Tab 4: Admin Accounts
3 roles: super_admin (full), support_admin (read + limited), viewer (read-only)
Admin table: name, email, role, created, last login, active sessions
Actions: edit profile, reset password, change role, deactivate, view login history

### Tab 5: System Health
KPIs: Platform Uptime, API Response Time, Error Rate, DB Response Time
Dependency Health: Supabase Auth/DB/Storage, Gemini API, Anthropic API, OpenAI Embeddings
Background Jobs Dashboard: schedule, last run, status, next run
Critical action emails sent to Super Admin immediately

## Critical Action Emails
- New admin created, School deactivated/reactived
- Bulk notification sent, Impersonation started
- Bulk price change, AI budget cap disabled

## Related Specs
- [[specs/super-admin/command-center]] (alert display)
- [[specs/super-admin/schools]] (impersonation)
