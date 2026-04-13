---
name: LERNEN Knowledge Base
description: Project knowledge graph for LERNEN EdTech SaaS
panel: index
type: dashboard
---

# LERNEN — Project Knowledge Base

> Obsidian vault for the LERNEN EdTech SaaS platform.

---

## Panel Specs

### Super Admin (6/6 — COMPLETE)

| Feature | Status | Priority |
|---------|--------|----------|
| [[specs/super-admin/command-center]] | Complete | P1 |
| [[specs/super-admin/schools]] | Complete | P1 |
| [[specs/super-admin/content-pipeline]] | Complete | P1 |
| [[specs/super-admin/communicate]] | Complete | P1 |
| [[specs/super-admin/financials]] | Complete | P1 |
| [[specs/super-admin/operations]] | Complete | P1 |

### Principal (0/? — PENDING)

*No specs yet. Start with [[specs/principal/overview]]*

### Teacher (0/? — PENDING)

*No specs yet.*

### Student (0/? — PENDING)

*No specs yet.*

---

## Architecture Decisions

- [[adrs/ADR-2026-001-multi-tenant]] — Multi-tenant via school_id
- [[adrs/ADR-2026-002-tech-stack]] — Next.js 14 + TypeScript + Supabase
- [[adrs/ADR-2026-003-role-enforcement]] — Role from public.users, not JWT

---

## Active ADRs

```dataview
TABLE id, title, status, date
FROM "adrs"
WHERE status = "proposed" OR status = "accepted"
SORT date DESC
```

---

## Feature Specs by Panel

```dataview
TABLE panel, status, count(file) as specs
FROM "specs"
WHERE type = "feature"
GROUP BY panel
```

---

## API Endpoints

```dataview
TABLE method, path, status
FROM "api/endpoints"
SORT path ASC
```

---

## Recent Sessions

```dataview
TABLE date, panel, status
FROM "daily"
SORT date DESC
LIMIT 10
```

---

## Vault Structure

```
docs/vault/
├── specs/           # Feature specifications by panel
│   ├── super-admin/ # 6 complete specs
│   ├── principal/   # Pending
│   ├── teacher/     # Pending
│   └── student/     # Pending
├── adrs/            # Architecture Decision Records
├── api/             # API documentation
├── templates/       # Templater templates
├── daily/           # Daily standup notes
└── decisions/       # Meeting notes
```

---

## How to Use

1. **New feature spec** → Use [[templates/feature-spec]]
2. **New ADR** → Use [[templates/adr]]
3. **Session log** → Use [[templates/session-log]]
4. **Daily standup** → Create `daily/YYYY-MM-DD.md`
5. **Query vault** → Use Dataview plugin

---

*Last updated: 2026-04-13*
