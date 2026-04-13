---
id: SA-SCH-001
title: Schools Management
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: [ADR-2026-001-multi-tenant]
tags: [schools, onboarding, multi-tenant, billing]
---

# Schools Management

## Overview

Full school lifecycle management: list, onboarding wizard, details view, freeze/unfreeze.

## Tabs

### Tab 1: All Schools
- Table with: name, status, principal, city, students, teachers, subscription, costs, AI budget
- Smart auto-grouping filters: by city, region, status, student count tier, pricing tier, expiry, activity
- Row actions: view details, impersonate principal, edit, pause/resume, change status, export
- Bulk actions: change status, export, send notification, update AI budget

### Tab 2: Add New School (7-step wizard)
1. **School Info**: name, board (CBSE), city, region, academic year
2. **Principal Account**: Send Invite (recommended) OR Create Directly
3. **Subscription**: trial/paid, duration, start/expiry, price per student/month
4. **AI Budget**: monthly budget, alert threshold %, is capped, reset day
5. **Branding**: GiNi name, logo URL, primary color
6. **Content Enablement**: auto-enable CBSE books (Principal CANNOT upload content)
7. **Review & Confirm**: summary, send invitation/create account

### Tab 3: School Details (6 sub-tabs)
- Overview: school info, principal, subscription, quick actions
- Team: principal card, teachers table, student count by grade
- AI & Costs: spend vs budget, cost trend, usage stats
- Content: enabled books, pre-gen toggles
- Notifications: notification history, feedback
- Settings: edit info, subscription, pricing, AI budget, branding, security

## School Statuses
- pending_onboarding (yellow)
- trial (blue)
- active (green)
- expired (red)
- deactivated (gray)

## Freeze/Unfreeze
- Deactivated: all users frozen, login blocked, data retained
- Reactivated: status reverts, users unfrozen, audit log entry

## Pricing Model
- Per-student-per-month (seat-based)
- Different schools = different prices
- Super Admin sets per school at onboarding

## Related Specs
- [[specs/super-admin/financials]] (billing)
- [[specs/super-admin/operations]] (impersonation)
