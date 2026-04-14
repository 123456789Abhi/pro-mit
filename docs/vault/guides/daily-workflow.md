---
title: Daily Workflow Guide
type: guide
created: 2026-04-14
updated: 2026-04-14
tags: [workflow, daily, guide]
---

# Daily Workflow Guide

This guide explains how to use Obsidian day-to-day for the LERNEN project.

---

## Morning: Start Your Day

### 1. Open Obsidian
- Open the vault (docs/vault/)
- Click on index.md (home page)

### 2. Check Dashboard
Look at these key queries:

**What is pending?**
```dataview
TASK
FROM ""
WHERE !completed AND !done
LIMIT 10
```

**What did I do recently?**
```dataview
TABLE date, panel, status
FROM "daily"
SORT date DESC
LIMIT 5
```

---

## During Work: Capture Decisions

### When you make a decision:

1. Ctrl + N → new note
2. Type /adr → Templater inserts ADR template
3. Fill in the context and decision
4. Save as adrs/ADR-2026-XXX-my-decision.md

### When you start a new feature:

1. Ctrl + N → new note
2. Type /spec → Templater inserts feature spec
3. Fill in requirements and design
4. Save as specs/super-admin/my-feature.md
5. Update status: proposed → in-progress

### When you finish something:

1. Open the spec note
2. Update frontmatter: status: implemented
3. Add to status history table

---

## End of Session: Log Your Work

### Quick Session Log (2 minutes)

1. Ctrl + N → new note
2. Type /session → Templater inserts session log
3. Fill in:
   - What Was Done: bullet points
   - Decisions Made: bullet points
   - Pending Work: bullet points
4. Save as daily/2026-04-14.md

---

## Weekly: Review Progress

### Every Monday morning:

Open index.md and check these queries:

**Spec completion by panel**
```dataview
TABLE panel, status, count(file) as count
FROM "specs"
WHERE type = "feature"
GROUP BY panel
```

**Open decisions**
```dataview
TABLE id, title, status, date
FROM "adrs"
WHERE status = "proposed"
SORT date DESC
```

---

## Creating New Content

### New Feature Spec
1. Ctrl + N
2. /feature-spec
3. Fill template
4. Save to specs/[panel]/[name].md

### New ADR
1. Ctrl + N
2. /adr
3. Fill template
4. Save to adrs/ADR-2026-XXX-title.md

---

## Linking Notes

### Wiki Links
- Type [[ to see suggestions
- Link between specs: [[specs/super-admin/command-center]]
- Link ADRs: [[adrs/ADR-2026-001-multi-tenant]]

### Tags
- Add #tag anywhere in a note
- Search: #school-management

---

## Workflow Summary

| Time | Action | Tool |
|------|--------|------|
| Morning | Check dashboard | Dataview queries |
| Work | Capture decisions | ADR template |
| Work | Track features | Feature-spec template |
| End of day | Log session | Session-log template |
| Weekly | Review progress | Index dashboard |

---

## Quick Commands

| Action | Command |
|--------|---------|
| New note | Ctrl + N |
| Quick switcher | Ctrl + O |
| New canvas | Ctrl + E |
| Toggle sidebar | Ctrl + B |

---

## Template Shortcuts

| Shortcut | Inserts |
|----------|---------|
| /adr | ADR template |
| /spec | Feature spec template |
| /session | Session log template |
| /daily | Daily note template |

---

Last updated: 2026-04-14
