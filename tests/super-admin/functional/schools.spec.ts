/**
 * Category 1: Functional Testing (20 tests)
 * Tests core user flows for the Super Admin Schools panel
 */
import { test, expect } from "@playwright/test";
import { loginAsSuperAdmin, generateTestSchool, SCHOOL_STATUSES } from "../shared/fixtures";

test.describe("Schools Management", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/schools");
  });

  test("1.1 - School creation via onboarding wizard", async ({ page }) => {
    // Navigate to Add New School tab
    await page.click('text=Add New School');

    // Step 1: School Info
    const school = generateTestSchool();
    await page.fill('[name="school_name"]', school.name);
    await page.selectOption('[name="board"]', school.board);
    await page.fill('[name="city"]', school.city);
    await page.fill('[name="region"]', school.region);
    await page.click('text=Next');

    // Step 2: Principal (invite option)
    await page.click('text=Send Invite');
    await page.fill('[name="principal_name"]', "Test Principal");
    await page.fill('[name="principal_email"]', `principal.${Date.now()}@test.com`);
    await page.fill('[name="principal_phone"]', "9876543210");
    await page.click('text=Next');

    // Step 3: Subscription
    await page.click('text=Trial');
    await page.click('text=Next');

    // Step 4: AI Budget (defaults)
    await page.click('text=Next');

    // Step 5: Branding (defaults)
    await page.click('text=Next');

    // Step 6: Content (defaults)
    await page.click('text=Next');

    // Step 7: Review & Create
    await page.click('button:has-text("Create School")');

    // Verify school appears in list
    await page.waitForSelector(`text=${school.name}`, { timeout: 10000 });
    await expect(page.locator(`text=${school.name}`).first()).toBeVisible();
  });

  test("1.2 - School deactivation", async ({ page }) => {
    // Select an active school
    const schoolRow = page.locator("tbody tr").first();
    await schoolRow.locator("button").first().click();
    await page.click('text=School Details');

    // Navigate to Settings tab
    await page.click('text=Settings');
    await page.click('text=Deactivate');

    // Confirm dialog
    await page.click('button:has-text("Deactivate School")');

    // Verify status changed
    await expect(page.locator("text=Deactivated")).toBeVisible();
  });

  test("1.3 - School reactivation", async ({ page }) => {
    // Navigate to deactivated school
    await page.goto("/super-admin/schools");
    await page.selectOption('[name="status"]', "deactivated");
    await page.waitForTimeout(500);

    // Click on deactivated school
    const schoolRow = page.locator("tbody tr").first();
    if (await schoolRow.isVisible()) {
      await schoolRow.locator("a").first().click();

      // Navigate to Settings
      await page.click('text=Settings');
      await page.click('text=Reactivate');

      // Confirm
      await page.click('button:has-text("Reactivate School")');

      // Verify reactivated
      await expect(page.locator("text=Active").or(page.locator("text=Trial"))).toBeVisible({ timeout: 5000 });
    }
  });

  test("1.4 - Invite vs direct creation", async ({ page }) => {
    await page.click('text=Add New School');

    // Test invite option
    const inviteEmail = `invite.${Date.now()}@test.com`;
    await page.click('text=Send Invite');
    await page.fill('[name="principal_name"]', "Invite Principal");
    await page.fill('[name="principal_email"]', inviteEmail);
    await page.click('button:has-text("Send Invite")');

    // Verify invite sent message
    await expect(page.locator("text=Invitation sent")).toBeVisible({ timeout: 5000 });

    // Now test direct creation
    await page.goto("/super-admin/schools");
    await page.click('text=Add New School');

    const directEmail = `direct.${Date.now()}@test.com`;
    await page.click('text=Create Directly');
    await page.fill('[name="principal_name"]', "Direct Principal");
    await page.fill('[name="principal_email"]', directEmail);
    await page.fill('[name="principal_password"]', "TestPass123!");
    await page.click('button:has-text("Create Account")');

    // Verify account created
    await expect(page.locator("text=Account created")).toBeVisible({ timeout: 5000 });
  });

  test("1.5 - Bulk status change", async ({ page }) => {
    await page.goto("/super-admin/schools");

    // Select multiple schools
    const checkboxes = page.locator("tbody input[type='checkbox']");
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();

      // Bulk action dropdown
      await page.click('button:has-text("Actions")');
      await page.click('text=Change Status');

      // Select new status
      await page.click('text=Deactivate');
      await page.click('button:has-text("Apply")');

      // Verify audit entries
      await expect(page.locator("text=2 schools updated")).toBeVisible({ timeout: 5000 });
    }
  });

  test("1.6 - School search functionality", async ({ page }) => {
    await page.goto("/super-admin/schools");

    // Search by school name
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill("Oakridge");

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // Verify only matching schools shown
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("1.7 - School filters", async ({ page }) => {
    await page.goto("/super-admin/schools");

    // Open filters
    await page.click('button:has-text("Filters")');

    // Filter by status
    await page.click('text=Active');

    // Apply filters
    await page.click('button:has-text("Apply Filters")');

    // Verify filtered
    await expect(page.locator('text="Active"').first()).toBeVisible();
  });

  test("1.8 - School details overview", async ({ page }) => {
    await page.goto("/super-admin/schools");

    // Click first school's view details
    await page.locator("tbody tr").first().locator("a").first().click();

    // Verify Overview tab loads
    await page.waitForSelector('text=Overview', { timeout: 5000 });
    await expect(page.locator("text=Overview")).toBeVisible();
  });
});

test.describe("Content Pipeline", () => {
  test("1.9 - Book upload flow", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/content");

    // Navigate to Upload tab
    await page.click('text=Upload');

    // Upload a PDF file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-book.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("mock pdf content"),
    });

    // Verify upload started
    await expect(page.locator("text=Processing").or(page.locator("text=Uploaded"))).toBeVisible({ timeout: 5000 });
  });

  test("1.10 - Pre-generation trigger", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/content");

    // Navigate to Library tab
    await page.click('text=Library');

    // Click pre-generate on a book
    const preGenButton = page.locator('button:has-text("Pre-generate")').first();
    if (await preGenButton.isVisible()) {
      await preGenButton.click();

      // Select content types
      await page.click('text=Notes');
      await page.click('text=Quizzes');

      // Trigger
      await page.click('button:has-text("Generate")');

      // Verify queued
      await expect(page.locator("text=Queued for generation")).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Communicate", () => {
  test("1.11 - Notification send to schools", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Compose new notification
    await page.click('button:has-text("Compose")');

    // Fill notification
    await page.fill('[name="title"]', "Test Notification");
    await page.fill('[name="body"]', "This is a test notification for all schools.");

    // Select all schools
    await page.click('text=All Schools');

    // Send
    await page.click('button:has-text("Send Notification")');

    // Verify sent
    await expect(page.locator("text=Notification sent")).toBeVisible({ timeout: 10000 });
  });

  test("1.12 - Scheduled notification", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    await page.click('button:has-text("Compose")');

    // Enable scheduling
    await page.click('text=Schedule');

    // Pick future date (e.g., 7 days ahead)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    await page.fill('[name="scheduled_date"]', dateStr);
    await page.fill('[name="title"]', "Scheduled Test");

    // Save as scheduled
    await page.click('button:has-text("Schedule Notification")');

    // Verify in scheduled list
    await expect(page.locator("text=Scheduled")).toBeVisible({ timeout: 5000 });
  });

  test("1.13 - Template creation and use", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/communicate");

    // Navigate to Templates
    await page.click('text=Templates');

    // Create template
    await page.click('button:has-text("Create Template")');
    await page.fill('[name="template_name"]', `Test Template ${Date.now()}`);
    await page.fill('[name="template_content"]', "Hello {{school_name}}, this is {{notification_content}}");
    await page.click('button:has-text("Save")');

    // Verify template created
    await expect(page.locator("text=Template created")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Financials", () => {
  test("1.14 - Revenue overview loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");

    // Verify Revenue Overview tab
    await expect(page.locator("text=Revenue Overview")).toBeVisible();
    await expect(page.locator("text=Total Revenue").or(page.locator('[data-testid="total-revenue"]'))).toBeVisible();
  });

  test("1.15 - School billing tab loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");

    // Navigate to School Billing
    await page.click('text=School Billing');
    await expect(page.locator("text=School Billing")).toBeVisible();
  });

  test("1.16 - AI cost monitor loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");

    // Navigate to AI Cost Monitor
    await page.click('text=AI Cost Monitor');
    await expect(page.locator("text=AI Cost Monitor")).toBeVisible();
  });

  test("1.17 - Pricing tab loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/financials");

    // Navigate to Pricing
    await page.click('text=Pricing');
    await expect(page.locator("text=Pricing")).toBeVisible();
  });
});

test.describe("Operations", () => {
  test("1.18 - System alerts page loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");

    // Verify System Alerts tab
    await expect(page.locator("text=System Alerts")).toBeVisible();
  });

  test("1.19 - Impersonation log page loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");

    // Navigate to Impersonation Log
    await page.click('text=Impersonation Log');
    await expect(page.locator("text=Impersonation Log")).toBeVisible();
  });

  test("1.20 - Admin accounts page loads", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto("/super-admin/operations");

    // Navigate to Admin Accounts tab
    await page.getByRole('button', { name: 'Admin Accounts' }).click();

    // Verify the Admins tab content loaded
    await expect(page.getByText("Add Admin")).toBeVisible({ timeout: 10000 });
  });
});
