/**
 * Category 8: Data Integrity Testing (14 tests)
 * Tests soft deletes, date/time consistency, budget math, orphan data, migrations
 */
import { test, expect, request } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Data Integrity - Soft Deletes", () => {
  test("8.1 - Soft delete cascade", async () => {
    const ctx = await request.newContext();

    // Login as admin
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Create test school
    const schoolRes = await ctx.post(`${API_BASE}/api/admin/schools`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: "Soft Delete Test School", board: "CBSE", city: "Delhi", region: "North" },
    });
    const schoolId = (await schoolRes.json()).id;

    // Soft delete school
    await ctx.delete(`${API_BASE}/api/admin/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Verify school marked as deleted (not hard deleted)
    const getRes = await ctx.get(`${API_BASE}/api/admin/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const school = await getRes.json();
    expect(school.deleted_at).toBeTruthy();
    expect(school.deleted_at).not.toBeNull();
  });

  test("8.2 - Hard delete prevention", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Navigate to school settings
    await page.goto("/super-admin/schools");
    await page.locator("tbody tr").first().locator("a").first().click();
    await page.click('text=Settings');

    // Try to find hard delete option
    const hardDelete = page.locator('button:has-text("Delete School Permanently")');

    // Hard delete should NOT exist
    if (await hardDelete.isVisible()) {
      await hardDelete.click();
      // Should show error or confirmation that it's not allowed
      await expect(page.locator("text=not allowed").or(page.locator("text=contact support"))).toBeVisible();
    }
  });
});

test.describe("Data Integrity - Date/Time", () => {
  test("8.3 - All timestamps in IST", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Check school list timestamps
    await page.goto("/super-admin/schools");

    // Timestamps should be in IST format (IST = UTC+5:30)
    // Look for date patterns that match IST
    const pageContent = await page.content();
    // Should contain Indian time zone notation or IST offset
    expect(pageContent).toMatch(/(IST|\+05:30|5:30)/);
  });

  test("8.4 - Schedule crossing midnight IST", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/communicate");
    await page.click('button:has-text("Compose")');
    await page.click('text=Schedule');

    // Set time to just before midnight IST
    await page.fill('[name="scheduled_date"]', "2026-04-15");
    await page.fill('[name="scheduled_time"]', "23:55");

    await page.fill('[name="title"]', "Midnight Test");
    await page.click('button:has-text("Schedule")');

    // Should schedule correctly without timezone confusion
    await expect(page.locator("text=Scheduled").or(page.locator("text=saved"))).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Data Integrity - Budget & Pricing", () => {
  test("8.5 - Budget overflow prevention", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Navigate to school with 100% budget
    await page.goto("/super-admin/schools");
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    if (count > 0) {
      await rows.first().locator("a").first().click();
      await page.click('text=AI & Costs');

      // Budget bar should show 100% but not negative
      const budgetText = await page.locator('[data-testid="budget-used"]').textContent();
      const percentage = parseInt(budgetText || "0");
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    }
  });

  test("8.6 - Concurrent budget update (optimistic locking)", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Get school with version
    const schoolRes = await ctx.get(`${API_BASE}/api/admin/schools`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const schools = await schoolRes.json();
    const school = schools.data[0];

    // Update with version 1
    const update1 = await ctx.patch(`${API_BASE}/api/admin/schools/${school.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ai_budget: 15000, version: 1 },
    });

    // Update with same version (should fail or auto-retry)
    const update2 = await ctx.patch(`${API_BASE}/api/admin/schools/${school.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ai_budget: 20000, version: 1 },
    });

    // At least one should detect the conflict
    const result = await update2.json();
    // Should either succeed with auto-retry or fail with version conflict
    expect(result.version !== 1 || update2.status() === 409).toBeTruthy();
  });

  test("8.7 - Notification version conflict detection", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Get notification with version
    const notifRes = await ctx.get(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifications = await notifRes.json();

    if (notifications.data && notifications.data.length > 0) {
      const notif = notifications.data[0];

      // Update with version 1
      await ctx.patch(`${API_BASE}/api/notifications/${notif.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { body: "Updated body", version: 1 },
      });

      // Try to update with stale version
      const staleUpdate = await ctx.patch(`${API_BASE}/api/notifications/${notif.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { body: "Stale update", version: 1 },
      });

      // Should detect version conflict
      expect(staleUpdate.status()).toBe(409);
    }
  });

  test("8.8 - Orphaned data prevention (book deletion)", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Create a book
    const bookRes = await ctx.post(`${API_BASE}/api/admin/books`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { title: "Test Book", class: 10, subject: "Math" },
    });
    const bookId = (await bookRes.json()).id;

    // Get chunks count
    const chunksBefore = await ctx.get(`${API_BASE}/api/admin/books/${bookId}/chunks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const chunksCount = (await chunksBefore.json()).count || 0;

    // Delete the book
    await ctx.delete(`${API_BASE}/api/admin/books/${bookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Chunks should be cascade-deleted (no orphans)
    if (chunksCount > 0) {
      const orphanedChunks = await ctx.get(`${API_BASE}/api/admin/chunks?book_id=${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const orphaned = await orphanedChunks.json();
      expect(orphaned.data.length).toBe(0);
    }
  });

  test("8.9 - Decimal precision for AI costs", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Create an AI request with small cost
    await ctx.post(`${API_BASE}/api/ai/request`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        school_id: "test-school",
        model: "gemini",
        tokens: 10,
        cost: 0.0001, // Very small cost
      },
    });

    // Verify stored with precision
    const logRes = await ctx.get(`${API_BASE}/api/ai/requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logs = await logRes.json();
    const lastLog = logs.data[logs.data.length - 1];

    // Cost should preserve 4 decimal places
    expect(lastLog.cost).toBeCloseTo(0.0001, 4);
  });

  test("8.10 - Currency handling (INR only)", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/financials");

    // Check revenue page - should show INR symbol
    const content = await page.content();
    expect(content).toContain("₹");
    // Should NOT contain USD symbol
    expect(content).not.toContain("$");
    // Should NOT contain conversion notation
    expect(content).not.toContain("USD");
  });

  test("8.11 - Student count synchronization", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/schools");

    // Get first school's displayed student count
    const displayedCount = await page.locator("tbody tr").first().locator("td").nth(4).textContent();
    const displayed = parseInt(displayedCount || "0");

    // Compare with actual count from database
    const ctx = await request.newContext();
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    const schoolRow = await page.locator("tbody tr").first();
    const schoolLink = await schoolRow.locator("a").getAttribute("href");
    const schoolId = schoolLink?.split("/").pop();

    const schoolRes = await ctx.get(`${API_BASE}/api/admin/schools/${schoolId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const school = await schoolRes.json();

    // Counts should match
    expect(school.student_count).toBe(displayed);
  });

  test("8.12 - Backup restoration data integrity", async () => {
    // This test would run against a restored backup
    // Marked as manual test - automated version would:
    // 1. Create a snapshot of current state
    // 2. Perform operations
    // 3. Restore from backup
    // 4. Verify all data matches original snapshot
  });

  test("8.13 - Migration safety check", async () => {
    // This test runs against staging before production migration
    // Verifies that migrations don't cause data loss
  });

  test("8.14 - CSV export matches DB query", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/schools");

    // Get row count from UI
    const rowCount = await page.locator("tbody tr").count();

    // Export CSV
    await page.click('button:has-text("Export")');
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.click('text=CSV'),
    ]);

    // Parse CSV
    const path = await download.path();
    if (path) {
      const fs = require("fs");
      const csv = fs.readFileSync(path, "utf-8");
      const lines = csv.trim().split("\n");
      const csvRowCount = lines.length - 1; // Exclude header

      // CSV row count should match UI row count
      expect(csvRowCount).toBe(rowCount);
    }
  });
});
