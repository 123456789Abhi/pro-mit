# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\functional\schools.spec.ts >> Schools Management >> 1.8 - School details overview
- Location: tests\super-admin\functional\schools.spec.ts:177:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('tbody tr').first().locator('a').first()

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
          - img [ref=e25]
        - link "Content Pipeline" [ref=e27] [cursor=pointer]:
          - /url: /super-admin/content
          - img [ref=e28]
          - generic [ref=e31]: Content Pipeline
        - link "Communicate" [ref=e32] [cursor=pointer]:
          - /url: /super-admin/communicate
          - img [ref=e33]
          - generic [ref=e35]: Communicate
        - link "Financials" [ref=e36] [cursor=pointer]:
          - /url: /super-admin/financials
          - img [ref=e37]
          - generic [ref=e40]: Financials
        - link "Operations" [ref=e41] [cursor=pointer]:
          - /url: /super-admin/operations
          - img [ref=e42]
          - generic [ref=e45]: Operations
      - generic [ref=e47]: Lernen v1.0 — Super Admin
    - main [ref=e48]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - generic [ref=e51]:
            - heading "Schools" [level=1] [ref=e52]
            - paragraph [ref=e53]: Manage all registered schools, onboarding, and settings
          - button "Add New School" [ref=e54] [cursor=pointer]:
            - img [ref=e55]
            - text: Add New School
        - generic [ref=e56]:
          - generic [ref=e57]:
            - button "All Schools" [ref=e58] [cursor=pointer]
            - button "Add New School" [ref=e59] [cursor=pointer]
            - button "School Details" [disabled] [ref=e60]
          - generic [ref=e61]:
            - generic [ref=e62]:
              - generic [ref=e63]:
                - img [ref=e64]
                - searchbox "Search schools by name, city, or region..." [ref=e67]
              - button "Filters" [ref=e68] [cursor=pointer]:
                - img [ref=e69]
                - text: Filters
              - button "Export" [ref=e71] [cursor=pointer]:
                - img [ref=e72]
                - text: Export
            - table [ref=e78]:
              - rowgroup [ref=e79]:
                - row "School Name Status Principal Location Students Teachers Price Joined Actions" [ref=e80]:
                  - columnheader [ref=e81]:
                    - checkbox [ref=e82] [cursor=pointer]
                  - columnheader "School Name" [ref=e83]:
                    - button "School Name" [ref=e84] [cursor=pointer]
                  - columnheader "Status" [ref=e85]
                  - columnheader "Principal" [ref=e86]
                  - columnheader "Location" [ref=e87]
                  - columnheader "Students" [ref=e88]:
                    - button "Students" [ref=e89] [cursor=pointer]
                  - columnheader "Teachers" [ref=e90]
                  - columnheader "Price" [ref=e91]:
                    - button "Price" [ref=e92] [cursor=pointer]
                  - columnheader "Joined" [ref=e93]:
                    - button "Joined" [ref=e94] [cursor=pointer]:
                      - text: Joined
                      - img [ref=e95]
                  - columnheader "Actions" [ref=e97]:
                    - generic [ref=e98]: Actions
              - rowgroup [ref=e99]:
                - row "No schools found Try adjusting your search or filters" [ref=e100]:
                  - cell "No schools found Try adjusting your search or filters" [ref=e101]:
                    - generic [ref=e102]:
                      - img [ref=e103]
                      - paragraph [ref=e107]: No schools found
                      - paragraph [ref=e108]: Try adjusting your search or filters
  - region "Notifications alt+T"
  - alert [ref=e109]
```

# Test source

```ts
  81  | 
  82  |       // Navigate to Settings
  83  |       await page.click('text=Settings');
  84  |       await page.click('text=Reactivate');
  85  | 
  86  |       // Confirm
  87  |       await page.click('button:has-text("Reactivate School")');
  88  | 
  89  |       // Verify reactivated
  90  |       await expect(page.locator("text=Active").or(page.locator("text=Trial"))).toBeVisible({ timeout: 5000 });
  91  |     }
  92  |   });
  93  | 
  94  |   test("1.4 - Invite vs direct creation", async ({ page }) => {
  95  |     await page.click('text=Add New School');
  96  | 
  97  |     // Test invite option
  98  |     const inviteEmail = `invite.${Date.now()}@test.com`;
  99  |     await page.click('text=Send Invite');
  100 |     await page.fill('[name="principal_name"]', "Invite Principal");
  101 |     await page.fill('[name="principal_email"]', inviteEmail);
  102 |     await page.click('button:has-text("Send Invite")');
  103 | 
  104 |     // Verify invite sent message
  105 |     await expect(page.locator("text=Invitation sent")).toBeVisible({ timeout: 5000 });
  106 | 
  107 |     // Now test direct creation
  108 |     await page.goto("/super-admin/schools");
  109 |     await page.click('text=Add New School');
  110 | 
  111 |     const directEmail = `direct.${Date.now()}@test.com`;
  112 |     await page.click('text=Create Directly');
  113 |     await page.fill('[name="principal_name"]', "Direct Principal");
  114 |     await page.fill('[name="principal_email"]', directEmail);
  115 |     await page.fill('[name="principal_password"]', "TestPass123!");
  116 |     await page.click('button:has-text("Create Account")');
  117 | 
  118 |     // Verify account created
  119 |     await expect(page.locator("text=Account created")).toBeVisible({ timeout: 5000 });
  120 |   });
  121 | 
  122 |   test("1.5 - Bulk status change", async ({ page }) => {
  123 |     await page.goto("/super-admin/schools");
  124 | 
  125 |     // Select multiple schools
  126 |     const checkboxes = page.locator("tbody input[type='checkbox']");
  127 |     const count = await checkboxes.count();
  128 |     if (count >= 2) {
  129 |       await checkboxes.nth(0).check();
  130 |       await checkboxes.nth(1).check();
  131 | 
  132 |       // Bulk action dropdown
  133 |       await page.click('button:has-text("Actions")');
  134 |       await page.click('text=Change Status');
  135 | 
  136 |       // Select new status
  137 |       await page.click('text=Deactivate');
  138 |       await page.click('button:has-text("Apply")');
  139 | 
  140 |       // Verify audit entries
  141 |       await expect(page.locator("text=2 schools updated")).toBeVisible({ timeout: 5000 });
  142 |     }
  143 |   });
  144 | 
  145 |   test("1.6 - School search functionality", async ({ page }) => {
  146 |     await page.goto("/super-admin/schools");
  147 | 
  148 |     // Search by school name
  149 |     const searchInput = page.locator('input[placeholder*="Search"]');
  150 |     await searchInput.fill("Oakridge");
  151 | 
  152 |     // Wait for filtered results
  153 |     await page.waitForTimeout(1000);
  154 | 
  155 |     // Verify only matching schools shown
  156 |     const rows = page.locator("tbody tr");
  157 |     const count = await rows.count();
  158 |     expect(count).toBeGreaterThan(0);
  159 |   });
  160 | 
  161 |   test("1.7 - School filters", async ({ page }) => {
  162 |     await page.goto("/super-admin/schools");
  163 | 
  164 |     // Open filters
  165 |     await page.click('button:has-text("Filters")');
  166 | 
  167 |     // Filter by status
  168 |     await page.click('text=Active');
  169 | 
  170 |     // Apply filters
  171 |     await page.click('button:has-text("Apply Filters")');
  172 | 
  173 |     // Verify filtered
  174 |     await expect(page.locator('text="Active"').first()).toBeVisible();
  175 |   });
  176 | 
  177 |   test("1.8 - School details overview", async ({ page }) => {
  178 |     await page.goto("/super-admin/schools");
  179 | 
  180 |     // Click first school's view details
> 181 |     await page.locator("tbody tr").first().locator("a").first().click();
      |                                                                 ^ Error: locator.click: Test timeout of 30000ms exceeded.
  182 | 
  183 |     // Verify Overview tab loads
  184 |     await page.waitForSelector('text=Overview', { timeout: 5000 });
  185 |     await expect(page.locator("text=Overview")).toBeVisible();
  186 |   });
  187 | });
  188 | 
  189 | test.describe("Content Pipeline", () => {
  190 |   test("1.9 - Book upload flow", async ({ page }) => {
  191 |     await loginAsSuperAdmin(page);
  192 |     await page.goto("/super-admin/content");
  193 | 
  194 |     // Navigate to Upload tab
  195 |     await page.click('text=Upload');
  196 | 
  197 |     // Upload a PDF file
  198 |     const fileInput = page.locator('input[type="file"]');
  199 |     await fileInput.setInputFiles({
  200 |       name: "test-book.pdf",
  201 |       mimeType: "application/pdf",
  202 |       buffer: Buffer.from("mock pdf content"),
  203 |     });
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
```