---
---
id: ADR-2026-003
title: Role Enforcement: public.users Table, NOT JWT Metadata
status: accepted
date: 2026-03-01
deciders:
  - Abhimnayu Singh
---

## Context

Aividzy stored role in JWT metadata, which can be spoofed. User role must come from a verifiable source.

Also: using `getSession()` (client-side) instead of `getUser()` (server-side verification).

## Decision

1. **Role stored in `public.users.role`** — NEVER in JWT metadata
2. **Use `getUser()`** — verifies JWT signature + DB check, NEVER `getSession()`
3. **Role checked at middleware** — on every request, block cross-role access
4. **school_id from `public.users`** — verified server-side, never trusted from client

## Consequences

### Positive
- Role cannot be spoofed (verified from DB)
- Middleware enforces cross-role blocking on every request
- Super Admin role checked before sensitive operations

### Negative
- Extra DB query on every request for role verification
- Middleware must check `users.deleted_at IS NULL` (deactivated users blocked)

### Neutral
- User role table has: super_admin, support_admin, viewer (operations), principal, teacher, student

## Implementation

```typescript
// middleware.ts
import { getUser } from '@/lib/supabase/server'

export async function middleware(request: NextRequest) {
  const { user } = await getUser() // verifies JWT + DB check
  
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  const schoolId = user.school_id // verified, not from client
  // ... role check, cross-role blocking, deleted_at check
  
  return NextResponse.next()
}
```

## Anti-Patterns (NEVER DO)

```typescript
// WRONG — role from JWT metadata
const role = user.role // can be spoofed

// WRONG — getSession() instead of getUser()
const { data: { session } } = await supabase.auth.getSession() // no verification

// WRONG — trust school_id from client
const schoolId = formData.get('school_id') // NEVER trust this
```

## Related ADRs
- [[adrs/ADR-2026-001-multi-tenant]]

## References
- CLAUDE.md: "Use getUser() NEVER getSession()"
- CLAUDE.md: "Role from public.users table — NEVER from JWT metadata"
