# Super Admin Panel — Test Execution Tracker
**Scale:** 100 schools × 2000 students = 200,000 total students
**Last Updated:** 2026-04-10
**Status:** BUILDING IN PROGRESS

---

## Test Execution Summary

| Category | Tests | Priority | Status | Passed | Failed | Blocked |
|----------|-------|----------|--------|--------|--------|---------|
| 1. Functional | 20 | P0 | PENDING | 0 | 0 | 0 |
| 2. Performance | 15 | P0 | PENDING | 0 | 0 | 0 |
| 3. Load | 10 | P1 | PENDING | 0 | 0 | 0 |
| 4. Stress | 10 | P1 | PENDING | 0 | 0 | 0 |
| 5. Security | 20 | P0 | PENDING | 0 | 0 | 0 |
| 6. Accessibility | 10 | P1 | PENDING | 0 | 0 | 0 |
| 7. Compatibility | 13 | P2 | PENDING | 0 | 0 | 0 |
| 8. Data Integrity | 14 | P0 | PENDING | 0 | 0 | 0 |
| 9. API & Integration | 12 | P1 | PENDING | 0 | 0 | 0 |
| 10. Business Logic | 20 | P0 | PENDING | 0 | 0 | 0 |
| 11. Regression | 8 | P0 | PENDING | 0 | 0 | 0 |
| 12. Monitoring | 10 | P1 | PENDING | 0 | 0 | 0 |
| **TOTAL** | **162** | | | **0** | **0** | **0** |

---

## Phase 1: Critical Path (P0)

### Category 1: Functional Testing (20 tests)

| ID | Test Case | Scenario | Expected Result | Status | Notes |
|----|-----------|---------|----------------|--------|-------|
| 1.1 | School creation | Create new school via onboarding wizard | School created, principal invited, status = pending_onboarding | PENDING | |
| 1.2 | School deactivation | Deactivate school from Schools page | All users frozen, status = deactivated, notifications cancelled | PENDING | |
| 1.3 | School reactivation | Reactivate frozen school | Status reverts to previous, users unfrozen | PENDING | |
| 1.4 | Invite vs direct creation | Create principal via invite AND direct | Both flows work, auth accounts created | PENDING | |
| 1.5 | Bulk status change | Select 10 schools, change status | All 10 updated, audit entries for each | PENDING | |
| 1.6 | Book upload | Upload PDF → process → verify chunks | PDF stored, chunks generated, embeddings created, status = ready | PENDING | |
| 1.7 | Pre-gen trigger | Manually trigger pre-gen for book | Notes/FAQ/Summaries/Quizzes/Drills generated | PENDING | |
| 1.8 | Notification send | Send notification to all 100 schools | Delivered to all principals, read counts tracked | PENDING | |
| 1.9 | Notification schedule | Schedule notification 90 days ahead | Saved as scheduled, no early delivery | PENDING | |
| 1.10 | Notification pause/resume | Pause scheduled, then resume | Status transitions correctly, audit entries | PENDING | |
| 1.11 | Rating request | Send notification with rating, recipient rates 1-5 | Rating stored, avg calculated, comment captured | PENDING | |
| 1.12 | Feedback reply | Super Admin replies to feedback | Reply sent as notification to sender only | PENDING | |
| 1.13 | Template create/use | Create template, use it to send notification | Template use_count increments, notification sent | PENDING | |
| 1.14 | Alert resolution | Resolve alert, add note | resolved_at set, note saved | PENDING | |
| 1.15 | Impersonation start/end | Start impersonation, perform actions, end | Session logged, actions recorded, session ended | PENDING | |
| 1.16 | Admin account creation | Create support_admin and viewer accounts | Accounts created, permissions enforced | PENDING | |
| 1.17 | Budget edit | Change school AI budget mid-month | Budget updated, spend continues from new amount | PENDING | |
| 1.18 | Price per student edit | Change price on school | Revenue recalculated, audit log entry | PENDING | |
| 1.19 | School groups filter | Apply 5 different filter combinations | Correct schools returned for each filter | PENDING | |
| 1.20 | Date range filter | Apply custom date range on Command Center | Metrics update to show only that range | PENDING | |

### Category 5: Security Testing (20 tests)

| ID | Test Case | Category | What to Verify | Status | Notes |
|----|-----------|----------|----------------|--------|-------|
| 5.1 | RLS policy enforcement | Database | School A cannot read School B data | PENDING | |
| 5.2 | Cross-role access block | Auth | Student cannot access /principal/* | PENDING | |
| 5.3 | JWT tampering | Auth | Modified JWT rejected | PENDING | |
| 5.4 | SQL injection | Input | ' OR 1=1 -- rejected | PENDING | |
| 5.5 | XSS in notification | Input | `<script>alert(1)</script>` sanitized | PENDING | |
| 5.6 | CSRF on notifications | Actions | Cross-site notification send blocked | PENDING | |
| 5.7 | Rate limiting bypass | API | Cannot exceed notification limits | PENDING | |
| 5.8 | Privilege escalation | Auth | support_admin cannot access super_admin actions | PENDING | |
| 5.9 | Session hijacking | Auth | Stolen session ID rejected | PENDING | |
| 5.10 | Impersonation abuse | Auth | Admin cannot impersonate without audit log | PENDING | |
| 5.11 | File upload injection | Upload | Malicious PDF rejected or sanitized | PENDING | |
| 5.12 | URL manipulation | Navigation | /schools/xyz → denied if not own school | PENDING | |
| 5.13 | API key exposure | Secrets | API keys not in client-side code | PENDING | |
| 5.14 | Audit log tampering | Compliance | Audit entries cannot be deleted/modified | PENDING | |
| 5.15 | Mass data extraction | Database | Cannot export 100 schools at once without audit | PENDING | |
| 5.16 | Brute force protection | Auth | >20 failed logins blocked | PENDING | |
| 5.17 | Sensitive data in logs | Compliance | No passwords/PII in logs | PENDING | |
| 5.18 | Admin account takeover | Auth | Reset password requires email verification | PENDING | |
| 5.19 | RLS policy bypass via RPC | Database | Direct RPC calls respect school_id | PENDING | |
| 5.20 | Redirect injection | Auth | ?redirectTo=evil.com blocked | PENDING | |

### Category 8: Data Integrity Testing (14 tests)

| ID | Test Case | What to Verify | Status | Notes |
|----|-----------|----------------|--------|-------|
| 8.1 | Soft delete cascade | Deleting school → users marked deleted_at | PENDING | |
| 8.2 | Hard delete prevention | Cannot hard delete active school data | PENDING | |
| 8.3 | Data export accuracy | CSV export matches DB query results | PENDING | |
| 8.4 | Date/time consistency | All timestamps in IST consistently | PENDING | |
| 8.5 | Timezone edge cases | Schedule notification crossing midnight IST | PENDING | |
| 8.6 | Budget overflow | School at 100% budget → AI stops, not negative | PENDING | |
| 8.7 | Concurrent budget update | Two Super Admins editing → optimistic lock works | PENDING | |
| 8.8 | Notification version conflict | Edit notification with stale version → rejected | PENDING | |
| 8.9 | Orphaned data | Deleting book → chunks orphaned? | PENDING | |
| 8.10 | Backup restoration | Restore from backup → all data intact | PENDING | |
| 8.11 | Migration safety | Run migration on production DB → no data loss | PENDING | |
| 8.12 | Decimal precision | AI cost calculations: ₹0.0001 precision | PENDING | |
| 8.13 | Currency handling | All prices in INR, no USD conversions | PENDING | |
| 8.14 | Student count sync | school.student_count matches actual count | PENDING | |

---

## Phase 2: Performance (P1)

### Category 2: Performance Testing (15 tests)

| ID | Test Case | Scenario | Target | Status |
|----|-----------|----------|--------|--------|
| 2.1 | Command Center load | Load dashboard | <3s p95 | PENDING |
| 2.2 | Schools table pagination | Load 100 schools | <1s initial, <200ms/page | PENDING |
| 2.3 | School search | Search by name | <500ms | PENDING |
| 2.4 | School filter combination | Filter by status+region+students+expiry | <1s | PENDING |
| 2.5 | Content Library load | Load 100+ master books | <2s | PENDING |
| 2.6 | Pre-gen content table | Load 1000+ items | <2s cursor pagination | PENDING |
| 2.7 | Coverage Report | Calculate coverage all subjects/grades | <5s | PENDING |
| 2.8 | Notification send to all | Send to 100 schools | <30s parallel delivery | PENDING |
| 2.9 | Bulk import/export | Export all schools CSV | <10s | PENDING |
| 2.10 | AI Cost Monitor | Load 12 months data | <3s | PENDING |
| 2.11 | Audit log scroll | Scroll through 1 year | Smooth, no lag | PENDING |
| 2.12 | Impersonation sessions | Load 100 sessions | <2s | PENDING |
| 2.13 | Memory usage | Open panel, leave 1 hour | <500MB browser | PENDING |
| 2.14 | Concurrent users | 100 Super Admins load Command Center | p95 <5s | PENDING |
| 2.15 | Image upload | Upload school logo 5MB | <3s | PENDING |

### Category 3: Load Testing (10 tests)

| ID | Test Case | Scenario | Scale | Status |
|----|-----------|----------|-------|--------|
| 3.1 | Concurrent school ops | 100 schools simultaneous | 100 ops/sec | PENDING |
| 3.2 | Notification spike | Send to all 100 schools | 100 concurrent DB writes | PENDING |
| 3.3 | Bulk school creation | Create 20 schools in parallel | 20 onboarding flows | PENDING |
| 3.4 | Book upload storm | Upload 10 books simultaneously | 10 PDF processing | PENDING |
| 3.5 | Alert generation storm | 30 alerts triggered | DB writes for all 30 | PENDING |
| 3.6 | Concurrent impersonations | 10 admins impersonating | 10 sessions | PENDING |
| 3.7 | Audit log writes | 100 actions in 1 minute | 100 entries/min sustained | PENDING |
| 3.8 | Dashboard refresh | 100 Super Admins refresh | 100 × queries | PENDING |
| 3.9 | Pre-gen generation load | Trigger for 5 books | 5 AI jobs | PENDING |
| 3.10 | Longevity test | Run at 50% for 8 hours | No degradation | PENDING |

### Category 4: Stress Testing (10 tests)

| ID | Test Case | Scenario | What to Measure | Status |
|----|-----------|----------|-----------------|--------|
| 4.1 | Max schools limit | Create 2000 schools (20x) | DB performance, query time | PENDING |
| 4.2 | Bulk notification all | Send to 200 schools | Edge function timeout | PENDING |
| 4.3 | Large school data | Load school with 10,000 students | Table rendering, pagination | PENDING |
| 4.4 | Pre-gen stress | Trigger for book with 1000 chapters | AI cost, time, queue | PENDING |
| 4.5 | Concurrent impersonations | 50 admins | Session management | PENDING |
| 4.6 | Audit log overflow | Write 1 million entries | DB storage, query perf | PENDING |
| 4.7 | Concurrent budget edits | 20 Super Admins | Race conditions | PENDING |
| 4.8 | Network failure | Kill network mid-notification | Idempotency | PENDING |
| 4.9 | Slowloris attack | Slow HTTP connections | Server timeout | PENDING |
| 4.10 | Memory exhaustion | Open 20 tabs | Browser stability | PENDING |

---

## Phase 3: Quality (P0/P1)

### Category 10: Business Logic Testing (20 tests)

| ID | Test Case | Scenario | Status |
|----|-----------|----------|--------|
| 10.1 | Zero students | School with 0 students | PENDING |
| 10.2 | 100% budget used | AI stops, no negative | PENDING |
| 10.3 | Trial → paid conversion | Mid-subscription change | PENDING |
| 10.4 | Price change mid-month | New price applies correctly | PENDING |
| 10.5 | Reactivation from expired | Billing restarts | PENDING |
| 10.6 | Notification to empty school | No recipients → error shown | PENDING |
| 10.7 | Pre-gen on empty book | 0 chapters → graceful | PENDING |
| 10.8 | Impersonation timeout | 30 min inactivity → ends | PENDING |
| 10.9 | Multiple Super Admins | 5 editing same school → no conflicts | PENDING |
| 10.10 | School without principal | Never invite → no crash | PENDING |
| 10.11 | Duplicate school name | Existing name → rejected | PENDING |
| 10.12 | Duplicate notification title | Same title → allowed (diff IDs) | PENDING |
| 10.13 | Rating after deletion | Deleted notification → error | PENDING |
| 10.14 | Rating on non-rating | Not a rating request → error | PENDING |
| 10.15 | Schedule beyond 90 days | Day 91 → rejected | PENDING |
| 10.16 | Schedule within 15 min | 10 min → rejected | PENDING |
| 10.17 | Zero-recipient warning | No matching → error before send | PENDING |
| 10.18 | Anonymous feedback <5 | <5 people → warning shown | PENDING |
| 10.19 | Class 9 book transition | Old ↔ new Kaveri → both work | PENDING |
| 10.20 | New student mid-notification | Enrolled after schedule → receives | PENDING |

### Category 9: API & Integration Testing (12 tests)

| ID | Test Case | Integration | Status |
|----|-----------|------------|--------|
| 9.1 | Supabase Auth | Login/logout flows | PENDING |
| 9.2 | Supabase DB | All RPC functions | PENDING |
| 9.3 | Supabase Storage | PDF upload/download | PENDING |
| 9.4 | Gemini API | AI queries to Gemini Flash | PENDING |
| 9.5 | Claude API | Haiku → quizzes, Sonnet → papers | PENDING |
| 9.6 | OpenAI Embeddings | 1536-dim vectors | PENDING |
| 9.7 | Edge Functions | Scheduled notifications trigger | PENDING |
| 9.8 | Email delivery | Forgot password emails | PENDING |
| 9.9 | Notification delivery | In-app notifications appear | PENDING |
| 9.10 | Cron jobs | Background jobs on schedule | PENDING |
| 9.11 | pgvector similarity | RAG queries return relevant | PENDING |
| 9.12 | Webhook retries | Payment webhooks retry | PENDING |

### Category 11: Regression Testing (8 tests)

| ID | Test Case | Trigger | Status |
|----|-----------|---------|--------|
| 11.1 | Post migration | 001_complete_schema.sql | PENDING |
| 11.2 | Post deployment | All pages load | PENDING |
| 11.3 | Post RLS change | School isolation | PENDING |
| 11.4 | Post RPC change | All callers work | PENDING |
| 11.5 | Post Edge Function | Scheduled notifications | PENDING |
| 11.6 | Post notification module | 52 notification tests | PENDING |
| 11.7 | Post auth change | Login, role, impersonation | PENDING |
| 11.8 | Post AI module | Routing, caching, costs | PENDING |

---

## Phase 4: Compliance (P1/P2)

### Category 6: Accessibility Testing (10 tests)

| ID | Test Case | Standard | Status |
|----|-----------|----------|--------|
| 6.1 | Keyboard navigation | All elements via Tab | PENDING |
| 6.2 | Screen reader | Tables read, alerts announced | PENDING |
| 6.3 | Color contrast | ≥4.5:1 ratio | PENDING |
| 6.4 | Focus indicators | Visible on all elements | PENDING |
| 6.5 | ARIA labels | All buttons/forms labeled | PENDING |
| 6.6 | Error messages | Announced to screen readers | PENDING |
| 6.7 | Alt text | Images have descriptions | PENDING |
| 6.8 | Form labels | All inputs associated | PENDING |
| 6.9 | Skip links | Navigation skip available | PENDING |
| 6.10 | Text resizing | UI usable at 200% zoom | PENDING |

### Category 7: Compatibility Testing (13 tests)

| ID | Test Case | Browser/OS | Status |
|----|-----------|------------|--------|
| 7.1 | Chrome latest | Full functionality | PENDING |
| 7.2 | Firefox latest | Full functionality | PENDING |
| 7.3 | Safari latest | Full functionality | PENDING |
| 7.4 | Edge latest | Full functionality | PENDING |
| 7.5 | Chrome mobile | Admin panel usable on tablet | PENDING |
| 7.6 | Safari mobile | Admin panel usable on tablet | PENDING |
| 7.7 | Windows 10 | Full functionality | PENDING |
| 7.8 | Windows 11 | Full functionality | PENDING |
| 7.9 | macOS Sonoma | Full functionality | PENDING |
| 7.10 | Dark mode | UI renders correctly | PENDING |
| 7.11 | Slow network | 3G, pages load within timeout | PENDING |
| 7.12 | Offline mode | Appropriate error shown | PENDING |
| 7.13 | Print stylesheet | Audit logs printable | PENDING |

### Category 12: Monitoring & Observability Testing (10 tests)

| ID | Test Case | What to Verify | Status |
|----|-----------|----------------|--------|
| 12.1 | Alert generation | admin_alerts every 5 min | PENDING |
| 12.2 | Alert resolution | resolved_at + note shown | PENDING |
| 12.3 | AI cost tracking | ai_request_log every call | PENDING |
| 12.4 | Cache hit tracking | response_source populated | PENDING |
| 12.5 | Notification audit | Every action logged with actor_id | PENDING |
| 12.6 | Impersonation logging | Every session recorded | PENDING |
| 12.7 | Error monitoring | Errors logged with stack trace | PENDING |
| 12.8 | Performance monitoring | Response times tracked | PENDING |
| 12.9 | Uptime monitoring | Heartbeat every 60s | PENDING |
| 12.10 | Budget alert triggering | 80% threshold fires | PENDING |

---

## Coverage Targets

| Test Type | Target | Current |
|-----------|--------|---------|
| Unit Tests | 80% code coverage | 0% |
| Integration Tests | All API endpoints | 0% |
| E2E Tests | All 6 Super Admin pages | 0% |
| Security Tests | All OWASP Top 10 | 0% |
| Performance Tests | All dashboard pages <3s | 0% |

---

## Notes

- Tests are designed for **100 schools × 2000 students** scale
- Performance targets scaled from 50 schools to 100 schools
- Load tests simulate realistic peak traffic patterns
- Security tests cover all OWASP Top 10 + LERNEN-specific requirements
- Tests will be executed once UI panels are built
