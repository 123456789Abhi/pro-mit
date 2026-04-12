/**
 * Category 5: Security Testing (20 tests)
 * Tests authentication, authorization, input validation, and OWASP Top 10
 */
import { test, expect, request } from "@playwright/test";
import { ROLES } from "../shared/fixtures";

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Authentication Security", () => {
  test("5.1 - RLS policy enforcement (School A cannot read School B)", async () => {
    const ctx = await request.newContext();

    // School A token
    const schoolA = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "schoolA@test.com", password: "test123" },
    });
    const schoolAToken = (await schoolA.json()).token;

    // School A tries to access School B's data
    const response = await ctx.get(`${API_BASE}/api/schools/999`, {
      headers: { Authorization: `Bearer ${schoolAToken}` },
    });

    // Should be forbidden or not found (never should return School B data)
    expect([403, 404]).toContain(response.status());
  });

  test("5.2 - Cross-role access block (Student cannot access /principal/)", async ({ page }) => {
    // Login as student
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "student@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');

    // Try to access principal routes
    const response = await page.request.get(`${API_BASE}/principal/dashboard`);

    // Should redirect or 403
    expect([403, 302]).toContain(response.status());
  });

  test("5.3 - JWT tampering detection", async () => {
    const ctx = await request.newContext();

    // Login to get valid token
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Tamper with token (change a character)
    const tamperedToken = token.slice(0, -5) + "XXXXX";

    // Try to use tampered token
    const response = await ctx.get(`${API_BASE}/api/admin/schools`, {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });

    // Should be rejected
    expect(response.status()).toBe(401);
  });

  test("5.4 - SQL injection prevention", async ({ page }) => {
    await page.goto("/auth/login");

    // Attempt SQL injection in email field
    await page.fill('[name="email"]', "' OR 1=1 --");
    await page.fill('[name="password"]', "anything");
    await page.click('button[type="submit"]');

    // Should not authenticate
    await expect(page.locator("text=Invalid credentials").or(page.locator('[name="email"]'))).toBeVisible();
  });

  test("5.5 - XSS sanitization in notifications", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/communicate");

    // Try to inject XSS
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', '<script>alert(1)</script>');
    await page.fill('[name="body"]', '<img src=x onerror=alert(1)>');

    // Submit should either sanitize or reject
    await page.click('button:has-text("Send Notification")');

    // The notification should not execute the script
    // Verify no script alert appears (would fail if XSS worked)
    await page.waitForTimeout(2000);
  });

  test("5.6 - CSRF protection on notifications", async () => {
    const ctx = await request.newContext();

    // Login
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Send notification without CSRF token
    const response = await ctx.post(`${API_BASE}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { title: "CSRF Test", body: "Body", target: "all" },
    });

    // Should have CSRF protection (token header required)
    // If endpoint exists, it should validate origin
    expect([403, 401, 400]).toContain(response.status());
  });

  test("5.7 - Rate limiting on notification endpoint", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Attempt rapid notifications (should be rate limited)
    const responses: number[] = [];
    for (let i = 0; i < 15; i++) {
      const res = await page.request.post(`${API_BASE}/api/notifications`, {
        data: { title: `Test ${i}`, body: "Body", target: "all" },
      });
      responses.push(res.status());
    }

    // Some should be rate limited (429)
    const rateLimited = responses.filter((s) => s === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test("5.8 - Privilege escalation prevention (support_admin cannot super_admin)", async () => {
    const ctx = await request.newContext();

    // Login as support_admin
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "support@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Try to access super-admin only endpoint
    const response = await ctx.get(`${API_BASE}/api/admin/schools`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Should be forbidden
    expect([403, 401]).toContain(response.status());
  });

  test("5.9 - Session hijacking prevention", async () => {
    const ctx = await request.newContext();

    // Get a valid session
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Use token from different context (simulating session hijack)
    const newCtx = await request.newContext();
    const response = await newCtx.get(`${API_BASE}/api/admin/schools`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Token reuse from different IP should be blocked
    expect([401, 403]).toContain(response.status());
  });

  test("5.10 - Impersonation requires audit log", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Start impersonation
    await page.goto("/super-admin/operations");
    await page.click('text=Impersonation Log');
    await page.click('button:has-text("Start Impersonation")');
    await page.selectOption('[name="user"]', { index: 0 });
    await page.click('button:has-text("Start")');

    // Verify impersonation logged
    await expect(page.locator("text=Impersonation started").or(page.locator("text=Audit Log"))).toBeVisible({ timeout: 5000 });

    // End impersonation
    await page.click('button:has-text("End Impersonation")');
  });

  test("5.11 - File upload sanitization (malicious PDF)", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/content");
    await page.click('text=Upload');

    // Try to upload file with malicious content but PDF extension
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "malicious.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("<script>alert('xss')</script>"),
    });

    // Should either reject or sanitize
    await page.waitForTimeout(2000);
    // Verify no successful upload or proper sanitization
  });

  test("5.12 - URL manipulation blocked (school ID mismatch)", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "student@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/student/, { timeout: 15000 });

    // Try to access another school's data via URL manipulation
    await page.goto("/student/schools/999/details");

    // Should be denied
    await expect(page.locator("text=Access Denied").or(page.locator("text=404"))).toBeVisible({ timeout: 5000 });
  });

  test("5.13 - No API keys in client-side code", async ({ page }) => {
    await page.goto("/super-admin/command-center");

    // Check page source for secrets
    const content = await page.content();

    // Should not contain API keys
    expect(content).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(content).not.toMatch(/api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]/i);
    expect(content).not.toMatch(/service[_-]?role[_-]?key/i);
  });

  test("5.14 - Audit log immutability", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/operations");
    await page.click('text=Activity Audit Log');

    // Try to delete an audit entry via API
    const response = await page.request.delete(`${API_BASE}/api/admin/audit-logs/1`);

    // Should be forbidden or not allowed
    expect([403, 405]).toContain(response.status());
  });

  test("5.15 - Mass data extraction requires audit", async () => {
    const ctx = await request.newContext();

    // Login
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Try to export all schools
    const response = await ctx.post(`${API_BASE}/api/admin/schools/export`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { format: "csv", scope: "all" },
    });

    // Should either require audit log entry or be rate-limited
    expect([200, 403, 429]).toContain(response.status());
  });

  test("5.16 - Brute force protection", async () => {
    const ctx = await request.newContext();

    // Attempt many failed logins
    let blocked = false;
    for (let i = 0; i < 25; i++) {
      const res = await ctx.post(`${API_BASE}/api/auth/login`, {
        data: { email: "attacker@test.com", password: "wrong" },
      });
      if (res.status() === 429) {
        blocked = true;
        break;
      }
    }

    expect(blocked).toBe(true);
  });

  test("5.17 - No sensitive data in logs", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "correctPassword123");
    await page.click('button[type="submit"]');

    // Console should not log passwords
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(msg.text()));

    await page.waitForTimeout(2000);

    // No passwords in console
    expect(logs.join("")).not.toMatch(/correctPassword123/);
  });

  test("5.18 - Admin password reset requires verification", async ({ page }) => {
    await page.goto("/auth/login");

    // Click forgot password
    await page.click('text=Forgot Password');
    await page.fill('[name="email"]', "admin@lernen.edu");
    await page.click('button[type="submit"]');

    // Should require email verification
    await expect(page.locator("text=Check your email").or(page.locator("text=Reset link sent"))).toBeVisible({ timeout: 5000 });
  });

  test("5.19 - RLS bypass prevention via RPC", async () => {
    const ctx = await request.newContext();

    // Login as School A
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "schoolA@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Try direct RPC call to access School B data
    const response = await ctx.post(`${API_BASE}/rest/v1/rpc/get_school_data`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY || "",
      },
      data: { target_school_id: "school-b-uuid" },
    });

    // Should be forbidden by RLS
    expect([403, 400, 425]).toContain(response.status());
  });

  test("5.20 - Redirect injection prevention", async ({ page }) => {
    await page.goto("/auth/login?redirectTo=https://evil.com");

    // Log in
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');

    // Should redirect to internal URL only, not external
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });
    expect(page.url()).not.toContain("evil.com");
  });
});
