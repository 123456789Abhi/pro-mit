# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\functional\schools.spec.ts >> Financials >> 1.14 - Revenue overview loads
- Location: tests\super-admin\functional\schools.spec.ts:299:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Revenue Overview')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Revenue Overview')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - link "L Lernen Super Admin" [ref=e5] [cursor=pointer]:
        - /url: /super-admin
        - generic [ref=e7]: L
        - generic [ref=e8]:
          - generic [ref=e9]: Lernen
          - generic [ref=e10]: Super Admin
      - navigation [ref=e11]:
        - link "Command Center" [ref=e12] [cursor=pointer]:
          - /url: /super-admin/command-center
          - img [ref=e13]
          - generic [ref=e18]: Command Center
        - link "Schools" [ref=e19] [cursor=pointer]:
          - /url: /super-admin/schools
          - img [ref=e20]
          - generic [ref=e24]: Schools
        - link "Content Pipeline" [ref=e25] [cursor=pointer]:
          - /url: /super-admin/content
          - img [ref=e26]
          - generic [ref=e29]: Content Pipeline
        - link "Communicate" [ref=e30] [cursor=pointer]:
          - /url: /super-admin/communicate
          - img [ref=e31]
          - generic [ref=e33]: Communicate
        - link "Financials" [ref=e34] [cursor=pointer]:
          - /url: /super-admin/financials
          - img [ref=e35]
          - generic [ref=e38]: Financials
          - img [ref=e39]
        - link "Operations" [ref=e41] [cursor=pointer]:
          - /url: /super-admin/operations
          - img [ref=e42]
          - generic [ref=e45]: Operations
      - generic [ref=e47]: Lernen v1.0 — Super Admin
    - main [ref=e48]:
      - paragraph [ref=e50]: Please log in to access this page.
  - region "Notifications alt+T"
  - alert [ref=e51]
```

# Test source

```ts
  204 | 
  205 |     // Verify upload started
  206 |     await expect(page.locator("text=Processing").or(page.locator("text=Uploaded"))).toBeVisible({ timeout: 5000 });
  207 |   });
  208 | 
  209 |   test("1.10 - Pre-generation trigger", async ({ page }) => {
  210 |     await loginAsSuperAdmin(page);
  211 |     await page.goto("/super-admin/content");
  212 | 
  213 |     // Navigate to Library tab
  214 |     await page.click('text=Library');
  215 | 
  216 |     // Click pre-generate on a book
  217 |     const preGenButton = page.locator('button:has-text("Pre-generate")').first();
  218 |     if (await preGenButton.isVisible()) {
  219 |       await preGenButton.click();
  220 | 
  221 |       // Select content types
  222 |       await page.click('text=Notes');
  223 |       await page.click('text=Quizzes');
  224 | 
  225 |       // Trigger
  226 |       await page.click('button:has-text("Generate")');
  227 | 
  228 |       // Verify queued
  229 |       await expect(page.locator("text=Queued for generation")).toBeVisible({ timeout: 5000 });
  230 |     }
  231 |   });
  232 | });
  233 | 
  234 | test.describe("Communicate", () => {
  235 |   test("1.11 - Notification send to schools", async ({ page }) => {
  236 |     await loginAsSuperAdmin(page);
  237 |     await page.goto("/super-admin/communicate");
  238 | 
  239 |     // Compose new notification
  240 |     await page.click('button:has-text("Compose")');
  241 | 
  242 |     // Fill notification
  243 |     await page.fill('[name="title"]', "Test Notification");
  244 |     await page.fill('[name="body"]', "This is a test notification for all schools.");
  245 | 
  246 |     // Select all schools
  247 |     await page.click('text=All Schools');
  248 | 
  249 |     // Send
  250 |     await page.click('button:has-text("Send Notification")');
  251 | 
  252 |     // Verify sent
  253 |     await expect(page.locator("text=Notification sent")).toBeVisible({ timeout: 10000 });
  254 |   });
  255 | 
  256 |   test("1.12 - Scheduled notification", async ({ page }) => {
  257 |     await loginAsSuperAdmin(page);
  258 |     await page.goto("/super-admin/communicate");
  259 | 
  260 |     await page.click('button:has-text("Compose")');
  261 | 
  262 |     // Enable scheduling
  263 |     await page.click('text=Schedule');
  264 | 
  265 |     // Pick future date (e.g., 7 days ahead)
  266 |     const futureDate = new Date();
  267 |     futureDate.setDate(futureDate.getDate() + 7);
  268 |     const dateStr = futureDate.toISOString().split("T")[0];
  269 | 
  270 |     await page.fill('[name="scheduled_date"]', dateStr);
  271 |     await page.fill('[name="title"]', "Scheduled Test");
  272 | 
  273 |     // Save as scheduled
  274 |     await page.click('button:has-text("Schedule Notification")');
  275 | 
  276 |     // Verify in scheduled list
  277 |     await expect(page.locator("text=Scheduled")).toBeVisible({ timeout: 5000 });
  278 |   });
  279 | 
  280 |   test("1.13 - Template creation and use", async ({ page }) => {
  281 |     await loginAsSuperAdmin(page);
  282 |     await page.goto("/super-admin/communicate");
  283 | 
  284 |     // Navigate to Templates
  285 |     await page.click('text=Templates');
  286 | 
  287 |     // Create template
  288 |     await page.click('button:has-text("Create Template")');
  289 |     await page.fill('[name="template_name"]', `Test Template ${Date.now()}`);
  290 |     await page.fill('[name="template_content"]', "Hello {{school_name}}, this is {{notification_content}}");
  291 |     await page.click('button:has-text("Save")');
  292 | 
  293 |     // Verify template created
  294 |     await expect(page.locator("text=Template created")).toBeVisible({ timeout: 5000 });
  295 |   });
  296 | });
  297 | 
  298 | test.describe("Financials", () => {
  299 |   test("1.14 - Revenue overview loads", async ({ page }) => {
  300 |     await loginAsSuperAdmin(page);
  301 |     await page.goto("/super-admin/financials");
  302 | 
  303 |     // Verify Revenue Overview tab
> 304 |     await expect(page.locator("text=Revenue Overview")).toBeVisible();
      |                                                         ^ Error: expect(locator).toBeVisible() failed
  305 |     await expect(page.locator("text=Total Revenue").or(page.locator('[data-testid="total-revenue"]'))).toBeVisible();
  306 |   });
  307 | 
  308 |   test("1.15 - School billing tab loads", async ({ page }) => {
  309 |     await loginAsSuperAdmin(page);
  310 |     await page.goto("/super-admin/financials");
  311 | 
  312 |     // Navigate to School Billing
  313 |     await page.click('text=School Billing');
  314 |     await expect(page.locator("text=School Billing")).toBeVisible();
  315 |   });
  316 | 
  317 |   test("1.16 - AI cost monitor loads", async ({ page }) => {
  318 |     await loginAsSuperAdmin(page);
  319 |     await page.goto("/super-admin/financials");
  320 | 
  321 |     // Navigate to AI Cost Monitor
  322 |     await page.click('text=AI Cost Monitor');
  323 |     await expect(page.locator("text=AI Cost Monitor")).toBeVisible();
  324 |   });
  325 | 
  326 |   test("1.17 - Pricing tab loads", async ({ page }) => {
  327 |     await loginAsSuperAdmin(page);
  328 |     await page.goto("/super-admin/financials");
  329 | 
  330 |     // Navigate to Pricing
  331 |     await page.click('text=Pricing');
  332 |     await expect(page.locator("text=Pricing")).toBeVisible();
  333 |   });
  334 | });
  335 | 
  336 | test.describe("Operations", () => {
  337 |   test("1.18 - System alerts page loads", async ({ page }) => {
  338 |     await loginAsSuperAdmin(page);
  339 |     await page.goto("/super-admin/operations");
  340 | 
  341 |     // Verify System Alerts tab
  342 |     await expect(page.locator("text=System Alerts")).toBeVisible();
  343 |   });
  344 | 
  345 |   test("1.19 - Impersonation log page loads", async ({ page }) => {
  346 |     await loginAsSuperAdmin(page);
  347 |     await page.goto("/super-admin/operations");
  348 | 
  349 |     // Navigate to Impersonation Log
  350 |     await page.click('text=Impersonation Log');
  351 |     await expect(page.locator("text=Impersonation Log")).toBeVisible();
  352 |   });
  353 | 
  354 |   test("1.20 - Admin accounts page loads", async ({ page }) => {
  355 |     await loginAsSuperAdmin(page);
  356 |     await page.goto("/super-admin/operations");
  357 | 
  358 |     // Navigate to Admin Accounts tab
  359 |     await page.getByRole('button', { name: 'Admin Accounts' }).click();
  360 | 
  361 |     // Verify the Admins tab content loaded
  362 |     await expect(page.getByText("Add Admin")).toBeVisible({ timeout: 10000 });
  363 |   });
  364 | });
  365 | 
```