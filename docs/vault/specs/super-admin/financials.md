---
id: SA-FIN-001
title: Financials
panel: super-admin
type: feature
status: implemented
owner: "@abhi"
priority: high
created: 2026-04-10
updated: 2026-04-13
linked-prs: []
linked-adrs: []
tags: [billing, revenue, ai-cost, pricing]
---

# Financials

## Overview

Platform-wide financial health, per-school billing, AI cost tracking (internal), and pricing management.

## Tabs (4 total)

### Tab 1: Revenue Overview
KPIs: MRR, Total Revenue, Total AI Cost (internal), Total Profit, ARPU, Cache Savings
Charts: Revenue vs Cost, Monthly Profit, Revenue by School/Region/Tier, Churned/New Revenue
Renewal Pipeline: schools sorted by days until expiry
Outstanding Payments: expired but active schools

### Tab 2: School Billing
Per-school financial details: student count, price/student/month, monthly revenue, total billed, AI cost (internal), profit margin
Invoice PDF generation → notification to principal
Payment tracking: Paid/Pending/Overdue/Waived per month
Subscription auto-runs, Super Admin sends reminders, manually freezes if unpaid

### Tab 3: AI Cost Monitor (INTERNAL ONLY — schools never see)
KPIs: AI Cost This Month, Cost per 1000 Queries, Cache Savings, Cache Hit Rate, AI as % of Revenue
Charts: Cost by Model (Gemini/Claude/OpenAI), Cost by School, Cost by Feature, Cost by Subject, Cost Efficiency Trend
Budget Alerts: schools sorted by % budget used (color-coded)

### Tab 4: Pricing Management
Per-student-per-month pricing, fully customizable per school
Pricing tiers (reference only, not enforced): Economy <₹500, Standard ₹500-₹1500, Premium ₹1500-₹3000, Enterprise >₹3000
Bulk pricing update, revenue impact preview
Default pricing for new schools

## Key Principles
1. **Schools only see their total bill** — never AI cost breakdown
2. **AI budget is internal tracking** — schools not charged separately
3. **Per-school pricing fully customizable** — no enforced tier
4. **Invoice to principal** — PDF via notification, student count × price, no AI cost shown

## Related Specs
- [[specs/super-admin/schools]] (subscription management)
- [[specs/super-admin/command-center]] (financial metrics)
