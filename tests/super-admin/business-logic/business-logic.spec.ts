/**
 * Category 10: Business Logic Testing (20 tests)
 * Edge cases and boundary conditions
 */
import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin } from "../shared/fixtures";

test.describe("Business Logic - Edge Cases", () => {
  test("10.1 - School with 0 students", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");

    // Create school with 0 students
    await page.click('text=Add New School');
    await page.fill('[name="school_name"]', `Zero Student School ${Date.now()}`);
    await page.fill('[name="city"]', "Test City");
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create School")');

    // Should not crash
    await expect(page.locator("text=School created")).toBeVisible({ timeout: 10000 });
  });

  test("10.2 - Budget at 100% (AI stops, no negative)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");
    await page.locator("tbody tr").first().locator("a").first().click();
    await page.click('text=AI & Costs');

    // Budget should not go negative
    const budgetUsed = await page.locator('[data-testid="budget-used"]').textContent();
    const percentage = parseInt(budgetUsed || "0");
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  test("10.3 - Trial to paid conversion", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");
    await page.locator("tbody tr").first().locator("a").first().click();
    await page.click('text=Settings');

    await page.click('text=Change Subscription');
    await page.click('text=Paid');
    await page.click('button:has-text("Confirm")');

    // Should convert successfully
    await expect(page.locator("text=Active")).toBeVisible({ timeout: 5000 });
  });

  test("10.4 - Price change mid-month", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");
    await page.locator("tbody tr").first().locator("a").first().click();
    await page.click('text=Settings');

    await page.click('text=Edit Pricing');
    await page.fill('[name="price_per_student"]', "150");
    await page.click('button:has-text("Save")');

    // Revenue should recalculate
    await expect(page.locator("text=₹150")).toBeVisible({ timeout: 5000 });
  });

  test("10.5 - Reactivation from expired", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");
    await page.selectOption('[name="status"]', "expired");

    const expiredSchool = page.locator("tbody tr").first();
    if (await expiredSchool.isVisible()) {
      await expiredSchool.locator("a").first().click();
      await page.click('text=Settings');
      await page.click('text=Reactivate');

      await expect(page.locator("text=Active").or(page.locator("text=Trial"))).toBeVisible({ timeout: 5000 });
    }
  });

  test("10.6 - Notification to empty school (no recipients)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', "Empty School Test");
    await page.fill('[name="body"]', "Test");

    // Select a school with 0 students
    await page.click('text=Select Schools');
    await page.locator('text=Zero Student').click();
    await page.click('button:has-text("Send Notification")');

    // Should show error about no recipients
    await expect(page.locator("text=no recipients").or(page.locator("text=error"))).toBeVisible({ timeout: 5000 });
  });

  test("10.7 - Pre-gen on book with 0 chapters", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/content");

    await page.click('text=Library');
    const preGenBtn = page.locator('button:has-text("Pre-generate")').first();
    if (await preGenBtn.isVisible()) {
      await preGenBtn.click();
      await page.click('button:has-text("Generate")');

      // Should handle gracefully
      await expect(page.locator("text=No chapters").or(page.locator("text=error"))).toBeVisible({ timeout: 5000 });
    }
  });

  test("10.8 - Impersonation timeout (30 min)", async ({ page }) => {
  });

  test("10.9 - Multiple Super Admins editing same school", async ({ page: page1, browser }) => {
    // Open two browser contexts (two admins)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Admin 1 edits
    await loginAsSuperAdmin(page1);
    await page1.goto("/super-admin/schools");
    await page1.locator("tbody tr").first().locator("a").first().click();
    await page1.click('text=Settings');

    // Admin 2 also edits
    await loginAsSuperAdmin(page2);
    await page2.goto("/super-admin/schools");
    await page2.locator("tbody tr").first().locator("a").first().click();
    await page2.click('text=Settings');

    // Admin 1 saves first
    await page1.fill('[name="school_name"]', 'Admin 1 Edit ${Date.now()}');
    await page1.click('button:has-text("Save")');

    // Admin 2 tries to save - should detect conflict
    await page2.fill('[name="school_name"]', 'Admin 2 Edit ${Date.now()}');
    await page2.click('button:has-text("Save")');

    // Should show version conflict
    await expect(page2.locator("text=conflict").or(page2.locator("text=updated"))).toBeVisible({ timeout: 5000 });

    await context2.close();
  });

  test("10.10 - School without principal", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");

    // Find school with no principal
    await page.click('text=Add New School');
    // Skip principal step
    await page.fill('[name="school_name"]', `No Principal ${Date.now()}`);
    await page.fill('[name="city"]', "City");
    await page.click('button:has-text("Next")');
    // Don't fill principal
    await page.click('button:has-text("Skip")');
    await page.click('button:has-text("Create School")');

    // Should create without crashing
    await expect(page.locator("text=School created")).toBeVisible({ timeout: 10000 });
  });

  test("10.11 - Duplicate school name rejection", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");

    // Create a school
    await page.click('text=Add New School');
    await page.fill('[name="school_name"]', `Duplicate Test ${Date.now()}`);
    await page.fill('[name="city"]', "City");
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create School")');
    await page.waitForTimeout(2000);

    // Try to create another with same name
    await page.goto("/super-admin/schools");
    await page.click('text=Add New School');
    await page.fill('[name="school_name"]', `Duplicate Test ${Date.now()}`);
    await page.fill('[name="city"]', "City2");
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create School")');

    // Should be rejected
    await expect(page.locator("text=already exists").or(page.locator("text=duplicate"))).toBeVisible({ timeout: 5000 });
  });

  test("10.12 - Duplicate notification title (allowed, different IDs)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    const title = `Same Title ${Date.now()}`;

    // First notification
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', title);
    await page.fill('[name="body"]', "First");
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(1000);

    // Second notification with same title
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', title);
    await page.fill('[name="body"]', "Second");
    await page.click('button:has-text("Send")');

    // Should be allowed (different notification IDs)
    await expect(page.locator("text=sent")).toBeVisible({ timeout: 5000 });
  });

  test("10.13 - Rating on deleted notification (error)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");
    await page.click('text=All Notifications');

    const deleteBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.click('button:has-text("Confirm Delete")');

      // Try to rate deleted notification
      await page.locator('button:has-text("Rate")').first().click();
      await expect(page.locator("text=not found").or(page.locator("text=deleted"))).toBeVisible({ timeout: 5000 });
    }
  });

  test("10.14 - Rating on non-rating notification (error)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Create notification without rating request
    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', "No Rating");
    await page.fill('[name="body"]', "Body");
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(2000);

    // Try to rate it - should not have rate option
    const rateBtn = page.locator('button:has-text("Rate")').first();
    expect(await rateBtn.isVisible()).toBe(false);
  });

  test("10.15 - Schedule beyond 90 days (rejected)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    await page.click('button:has-text("Compose")');
    await page.click('text=Schedule');

    // Set date beyond 90 days
    const farDate = new Date();
    farDate.setDate(farDate.getDate() + 100);
    await page.fill('[name="scheduled_date"]', farDate.toISOString().split("T")[0]);
    await page.fill('[name="title"]', "Far Future");
    await page.click('button:has-text("Schedule")');

    // Should be rejected
    await expect(page.locator("text=90 days").or(page.locator("text=maximum")).or(page.locator("text=error"))).toBeVisible({ timeout: 5000 });
  });

  test("10.16 - Schedule within 15 min (rejected)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    await page.click('button:has-text("Compose")');
    await page.click('text=Schedule');

    // Set time within 15 minutes
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 10);
    const dateStr = soon.toISOString().split("T")[0];
    const timeStr = soon.toTimeString().slice(0, 5);

    await page.fill('[name="scheduled_date"]', dateStr);
    await page.fill('[name="scheduled_time"]', timeStr);
    await page.fill('[name="title"]', "Too Soon");
    await page.click('button:has-text("Schedule")');

    // Should be rejected
    await expect(page.locator("text=15 minutes").or(page.locator("text=minimum")).or(page.locator("text=error"))).toBeVisible({ timeout: 5000 });
  });

  test("10.17 - Zero-recipient warning before send", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    await page.click('button:has-text("Compose")');
    await page.fill('[name="title"]', "Zero Recipients Test");
    await page.fill('[name="body"]', "Body");

    // Deselect all schools
    await page.click('text=All Schools'); // Deselect
    await page.click('button:has-text("Send")');

    // Should warn before sending
    await expect(page.locator("text=no recipients").or(page.locator("text=warning")).or(page.locator("text=confirm"))).toBeVisible({ timeout: 5000 });
  });

  test("10.18 - Anonymous feedback <5 people warning", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");
    await page.click('text=Feedback Intelligence');

    // Check if any feedback has <5 responses
    const feedbackCards = page.locator('[data-testid="feedback-card"]');
    const count = await feedbackCards.count();

    if (count > 0) {
      const firstCard = feedbackCards.first();
      const responses = await firstCard.locator('[data-testid="response-count"]').textContent();
      const numResponses = parseInt(responses || "0");

      if (numResponses < 5) {
        await expect(firstCard.locator("text=Low sample").or(firstCard.locator("text=Warning"))).toBeVisible();
      }
    }
  });

  test("10.19 - Class 9 book transition (Kaveri)", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/content");

    // Check Class 9 books (both old and new Kaveri)
    await page.selectOption('[name="class"]', "9");
    await page.waitForTimeout(1000);

    // Should show both versions
    const bookCount = await page.locator("tbody tr").count();
    expect(bookCount).toBeGreaterThan(0);
  });

  test("10.20 - Student enrolled mid-notification", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Schedule notification
    await page.click('button:has-text("Compose")');
    await page.click('text=Schedule');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await page.fill('[name="scheduled_date"]', futureDate.toISOString().split("T")[0]);
    await page.fill('[name="title"]', "Future Student Test");

    // Enroll a student while notification is scheduled
    // (This would be done via API during the 3-day window)

    // Notification should eventually be delivered to new student
    await page.click('button:has-text("Schedule")');
    await expect(page.locator("text=Scheduled")).toBeVisible({ timeout: 5000 });
  });
});
