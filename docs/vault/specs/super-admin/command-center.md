---
id: SA-CC-001
title: Super Admin Command Center
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: []
tags: [dashboard, monitoring, alerts, metrics]
---

# Super Admin Command Center

## Overview

Single pane of glass for both monitoring AND action. Hybrid approach where Super Admin can monitor AND act from one place.

## Date Filter
- Custom date range picker (replaces daily/weekly/monthly static toggles)
- Default: last 30 days

## Metrics Sections (9 total)

### A. Platform Overview KPIs
- Total Active Schools, Total Students, MRR, DAU
- AI Queries Today / This Month
- Platform Uptime %

### B. Financial Metrics
- Total AI Spend, Revenue vs Cost, Avg AI cost per student
- Top 5 highest-cost schools, Budget alerts
- Revenue forecasting (renewals due 30/60/90 days)

### C. Student Engagement Metrics
- DAU/WAU, Student Retention (DAU/MAU ratio)
- AI Interaction Rate, Avg AI queries per active student
- Quiz completion rate, Quiz Pass Rate (>60%)
- Risk Student Count

### D. AI System Performance
- AI Response Time (p50, p95, p99)
- Cache Hit Rate, Model usage breakdown
- Pre-gen FAQ hit rate, Failed AI calls

### E. Content Pipeline Health
- Books in Pipeline (pending/processing/ready/failed)
- Pre-gen coverage %, Schools with <50% content coverage
- Content Pipeline Velocity

### F. School Health & Onboarding
- New schools this month, Schools at risk
- Schools expiring in next 30 days
- Teacher onboarding rate, Zero AI Activity alerts

### G. Notification System Health
- Notifications sent, Delivery rate, Failure rate
- Notification Rating Avg

### H. System & Infrastructure
- API response time (p95), Error rate
- Active impersonation sessions, Suspicious Cross-School Access

### I. Comparative / Trend Metrics
- Week-over-week growth, Month-over-month comparison
- School ranking table

## Alert System (30 alerts, 4 severity tiers)

### Critical
- AI API Down, Database Unavailable, Payment Failed
- Security Breach (brute force), Budget Exhausted
- Suspicious Cross-School Access, New Admin Created

### High
- AI Cost Spike (>150%), Cache Hit Rate Drop (<60%)
- High Error Rate (>5%), Notification Failure Rate (>20%)
- Content Processing Failed, Bulk Data Anomaly

### Medium
- Budget Warning (80%), Low Engagement, Slow AI Response
- Teacher Not Active, Quiz Failure, Zero AI Activity

### Low
- Trial Expiring Soon, New School Onboarded
- Unused Template, Notification Quality Drop

## Action Panel
- Resolve alert → mark resolved + add note
- Pause school → confirm → paused
- Trigger job → job started + live progress
- View impersonation log, Retry failed notifications
- Start/End impersonation sessions

## Related Specs
- [[specs/super-admin/operations]] (alert generation)
- [[specs/super-admin/schools]] (school management)
