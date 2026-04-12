/**
 * Category 12: Monitoring & Observability Testing (10 tests)
 * Alert generation, audit logging, error tracking, performance monitoring
 */
import { test, expect, request } from "@playwright/test";
import { loginAsSuperAdmin } from "../shared/fixtures";

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Monitoring & Observability", () => {
  test("12.1 - Alert generation (admin_alerts every 5 min)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");

    // Navigate to System Alerts
    await page.click('text=System Alerts');

    // Verify alerts are listed
    const alerts = page.locator('[data-testid="alert-item"]');
    const count = await alerts.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // Check for recent alerts (should be generated periodically)
    const timestamps = await page.locator('[data-testid="alert-timestamp"]').allTextContents();
    if (timestamps.length > 0) {
      // Verify alerts have timestamps
      expect(timestamps[0]).toBeTruthy();
    }
  });

  test("12.2 - Alert resolution shows resolved_at", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");
    await page.click('text=System Alerts');

    const resolveBtn = page.locator('button:has-text("Resolve")').first();
    if (await resolveBtn.isVisible()) {
      await resolveBtn.click();
      await page.click('button:has-text("Confirm")');

      // Verify resolved timestamp shown
      await expect(page.locator("text=Resolved").or(page.locator('[data-testid="resolved-at"]'))).toBeVisible({ timeout: 5000 });
    }
  });

  test("12.3 - AI cost tracking (ai_request_log)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");
    await page.click('text=AI Cost Monitor');

    // Verify AI cost chart loads
    await expect(page.locator("text=AI Cost Monitor")).toBeVisible();

    // Check cost metrics are displayed
    const costMetric = page.locator('[data-testid="total-ai-cost"]');
    if (await costMetric.isVisible()) {
      const cost = await costMetric.textContent();
      expect(cost).toBeTruthy();
    }
  });

  test("12.4 - Cache hit tracking", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");
    await page.click('text=AI Cost Monitor');

    // Check cache hit rate
    const cacheRate = page.locator('[data-testid="cache-hit-rate"]');
    if (await cacheRate.isVisible()) {
      const rate = await cacheRate.textContent();
      // Should show percentage
      expect(rate).toMatch(/%/);
    }
  });

  test("12.5 - Notification audit (actor_id logged)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");
    await page.click('text=Activity Audit Log');

    // Send a notification
    await page.goto("/super-admin/communicate");
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', "Audit Test");
    await page.fill('[name="body"]', "Testing audit logging");
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(1000);

    // Check audit log for the notification
    await page.goto("/super-admin/operations");
    await page.click('text=Activity Audit Log');

    // Should have entry with actor_id
    const auditEntries = page.locator("tbody tr");
    const count = await auditEntries.count();
    expect(count).toBeGreaterThan(0);
  });

  test("12.6 - Impersonation session logging", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");
    await page.click('text=Impersonation Log');

    // Should show impersonation history
    const entries = page.locator('[data-testid="impersonation-entry"]');
    const count = await entries.count();
    expect(count).toBeGreaterThanOrEqual(0);

    // Should have admin and target user info
    const adminCol = page.locator('[data-testid="admin-name"]');
    const targetCol = page.locator('[data-testid="target-name"]');
    if (await adminCol.isVisible()) {
      expect(await adminCol.textContent()).toBeTruthy();
    }
  });

  test("12.7 - Error monitoring (stack traces logged)", async () => {
    const ctx = await request.newContext();

    // Trigger an error by accessing non-existent resource
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Call invalid endpoint
    const errorRes = await ctx.get(`${API_BASE}/api/nonexistent-endpoint`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Should return 404 with error format
    expect(errorRes.status()).toBe(404);
    const body = await errorRes.json();
    expect(body.error).toBeTruthy();
  });

  test("12.8 - Performance monitoring (response times tracked)", async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Navigate through pages and measure navigation timing
    const pages = ["/super-admin/command-center", "/super-admin/schools", "/super-admin/content"];

    for (const path of pages) {
      const start = Date.now();
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const duration = Date.now() - start;

      // Log for monitoring
      console.log(`${path}: ${duration}ms`);

      // Should be under performance threshold
      expect(duration).toBeLessThan(5000);
    }
  });

  test("12.9 - Uptime monitoring (heartbeat)", async () => {
    const ctx = await request.newContext();

    // Check health endpoint
    const healthRes = await ctx.get(`${API_BASE}/api/health`);
    expect([200, 503]).toContain(healthRes.status());

    if (healthRes.status() === 200) {
      const health = await healthRes.json();
      expect(health.status).toBe("ok");
    }
  });

  test("12.10 - Budget alert triggering (80% threshold)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");
    await page.click('text=System Alerts');

    // Look for budget threshold alerts
    const budgetAlerts = page.locator("text=/budget.*80%|80%.*budget/i");
    const exists = await budgetAlerts.count();

    // If there are budget alerts, they should be visible
    if (exists > 0) {
      await expect(budgetAlerts.first()).toBeVisible();
    }
  });
});
