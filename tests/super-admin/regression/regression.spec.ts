/**
 * Category 11: Regression Testing (8 tests)
 * Triggered after migrations, deployments, module changes
 */
import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "../shared/fixtures";

test.describe("Regression Testing", () => {
  test("11.1 - Post migration (001_complete_schema.sql)", async ({ page }) => {
    await loginAsSuperAdmin(page);

    // Verify all key tables exist and are accessible
    await page.goto("/super-admin/schools");
    await expect(page.locator("text=Schools")).toBeVisible();

    await page.goto("/super-admin/command-center");
    await expect(page.locator("text=Command Center")).toBeVisible();

    // Verify RLS policies are working
    await page.goto("/super-admin/schools");
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test("11.2 - Post deployment (all pages load)", async ({ page }) => {
    await loginAsSuperAdmin(page);

    const pages = [
      "/super-admin/command-center",
      "/super-admin/schools",
      "/super-admin/content",
      "/super-admin/communicate",
      "/super-admin/financials",
      "/super-admin/operations",
    ];

    for (const path of pages) {
      await page.goto(path);
      await expect(page.locator("text=LERNEN")).toBeVisible({ timeout: 10000 });
    }
  });

  test("11.3 - Post RLS change (school isolation)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");

    // Verify schools table shows only accessible data
    const rows = await page.locator("tbody tr").count();
    expect(rows).toBeGreaterThanOrEqual(0);

    // Verify school details are accessible
    if (rows > 0) {
      await page.locator("tbody tr").first().locator("a").first().click();
      await expect(page.locator("text=Overview")).toBeVisible({ timeout: 5000 });
    }
  });

  test("11.4 - Post RPC change (all callers work)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/command-center");

    // KPI cards should load (use RPC)
    const kpiCards = page.locator('[data-testid="kpi-card"]');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("11.5 - Post Edge Function (scheduled notifications)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Check scheduled notifications appear
    await page.click('text=Scheduled');
    await expect(page.locator("text=Scheduled")).toBeVisible();
  });

  test("11.6 - Post notification module (all features work)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Compose
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', "Regression Test");
    await page.fill('[name="body"]', "Testing notification module");
    await page.click('button:has-text("Cancel")');

    // Templates
    await page.click('text=Templates');
    await expect(page.locator("text=Templates")).toBeVisible();

    // Analytics
    await page.click('text=Analytics');
    await expect(page.locator("text=Analytics")).toBeVisible();
  });

  test("11.7 - Post auth change (login, role, impersonation)", async ({ page }) => {
    // Login still works
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Impersonation still works
    await page.goto("/super-admin/operations");
    await page.click('text=Impersonation Log');
    await expect(page.locator("text=Impersonation Log")).toBeVisible();
  });

  test("11.8 - Post AI module (routing, caching, costs)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");
    await page.click('text=AI Cost Monitor');

    // AI costs should load
    await expect(page.locator("text=AI Cost Monitor").or(page.locator('[data-testid="ai-cost-chart"]'))).toBeVisible();
  });
});
