# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\data-integrity\data-integrity.spec.ts >> Data Integrity - Soft Deletes >> 8.1 - Soft delete cascade
- Location: tests\super-admin\data-integrity\data-integrity.spec.ts:10:7

# Error details

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

# Test source

```ts
  1   | /**
  2   |  * Category 8: Data Integrity Testing (14 tests)
  3   |  * Tests soft deletes, date/time consistency, budget math, orphan data, migrations
  4   |  */
  5   | import { test, expect, request } from "@playwright/test";
  6   | 
  7   | const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  8   | 
  9   | test.describe("Data Integrity - Soft Deletes", () => {
  10  |   test("8.1 - Soft delete cascade", async () => {
  11  |     const ctx = await request.newContext();
  12  | 
  13  |     // Login as admin
  14  |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  15  |       data: { email: "admin@test.com", password: "test123" },
  16  |     });
> 17  |     const token = (await loginRes.json()).token;
      |                    ^ SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  18  | 
  19  |     // Create test school
  20  |     const schoolRes = await ctx.post(`${API_BASE}/api/admin/schools`, {
  21  |       headers: { Authorization: `Bearer ${token}` },
  22  |       data: { name: "Soft Delete Test School", board: "CBSE", city: "Delhi", region: "North" },
  23  |     });
  24  |     const schoolId = (await schoolRes.json()).id;
  25  | 
  26  |     // Soft delete school
  27  |     await ctx.delete(`${API_BASE}/api/admin/schools/${schoolId}`, {
  28  |       headers: { Authorization: `Bearer ${token}` },
  29  |     });
  30  | 
  31  |     // Verify school marked as deleted (not hard deleted)
  32  |     const getRes = await ctx.get(`${API_BASE}/api/admin/schools/${schoolId}`, {
  33  |       headers: { Authorization: `Bearer ${token}` },
  34  |     });
  35  | 
  36  |     const school = await getRes.json();
  37  |     expect(school.deleted_at).toBeTruthy();
  38  |     expect(school.deleted_at).not.toBeNull();
  39  |   });
  40  | 
  41  |   test("8.2 - Hard delete prevention", async ({ page }) => {
  42  |     await page.goto("/auth/login");
  43  |     await page.fill('[name="email"]', "admin@test.com");
  44  |     await page.fill('[name="password"]', "test123");
  45  |     await page.click('button[type="submit"]');
  46  |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  47  | 
  48  |     // Navigate to school settings
  49  |     await page.goto("/super-admin/schools");
  50  |     await page.locator("tbody tr").first().locator("a").first().click();
  51  |     await page.click('text=Settings');
  52  | 
  53  |     // Try to find hard delete option
  54  |     const hardDelete = page.locator('button:has-text("Delete School Permanently")');
  55  | 
  56  |     // Hard delete should NOT exist
  57  |     if (await hardDelete.isVisible()) {
  58  |       await hardDelete.click();
  59  |       // Should show error or confirmation that it's not allowed
  60  |       await expect(page.locator("text=not allowed").or(page.locator("text=contact support"))).toBeVisible();
  61  |     }
  62  |   });
  63  | });
  64  | 
  65  | test.describe("Data Integrity - Date/Time", () => {
  66  |   test("8.3 - All timestamps in IST", async ({ page }) => {
  67  |     await page.goto("/auth/login");
  68  |     await page.fill('[name="email"]', "admin@test.com");
  69  |     await page.fill('[name="password"]', "test123");
  70  |     await page.click('button[type="submit"]');
  71  |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  72  | 
  73  |     // Check school list timestamps
  74  |     await page.goto("/super-admin/schools");
  75  | 
  76  |     // Timestamps should be in IST format (IST = UTC+5:30)
  77  |     // Look for date patterns that match IST
  78  |     const pageContent = await page.content();
  79  |     // Should contain Indian time zone notation or IST offset
  80  |     expect(pageContent).toMatch(/(IST|\+05:30|5:30)/);
  81  |   });
  82  | 
  83  |   test("8.4 - Schedule crossing midnight IST", async ({ page }) => {
  84  |     await page.goto("/auth/login");
  85  |     await page.fill('[name="email"]', "admin@test.com");
  86  |     await page.fill('[name="password"]', "test123");
  87  |     await page.click('button[type="submit"]');
  88  |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  89  | 
  90  |     await page.goto("/super-admin/communicate");
  91  |     await page.click('button:has-text("Compose")');
  92  |     await page.click('text=Schedule');
  93  | 
  94  |     // Set time to just before midnight IST
  95  |     await page.fill('[name="scheduled_date"]', "2026-04-15");
  96  |     await page.fill('[name="scheduled_time"]', "23:55");
  97  | 
  98  |     await page.fill('[name="title"]', "Midnight Test");
  99  |     await page.click('button:has-text("Schedule")');
  100 | 
  101 |     // Should schedule correctly without timezone confusion
  102 |     await expect(page.locator("text=Scheduled").or(page.locator("text=saved"))).toBeVisible({ timeout: 5000 });
  103 |   });
  104 | });
  105 | 
  106 | test.describe("Data Integrity - Budget & Pricing", () => {
  107 |   test("8.5 - Budget overflow prevention", async ({ page }) => {
  108 |     await page.goto("/auth/login");
  109 |     await page.fill('[name="email"]', "admin@test.com");
  110 |     await page.fill('[name="password"]', "test123");
  111 |     await page.click('button[type="submit"]');
  112 |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  113 | 
  114 |     // Navigate to school with 100% budget
  115 |     await page.goto("/super-admin/schools");
  116 |     const rows = page.locator("tbody tr");
  117 |     const count = await rows.count();
```