# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\functional\schools.spec.ts >> Schools Management >> 1.2 - School deactivation
- Location: tests\super-admin\functional\schools.spec.ts:54:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
                    - checkbox
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
```

# Test source

```ts
  1   | /**
  2   |  * Category 1: Functional Testing (20 tests)
  3   |  * Tests core user flows for the Super Admin Schools panel
  4   |  */
  5   | import { test, expect } from "@playwright/test";
  6   | import { loginAsSuperAdmin, generateTestSchool, SCHOOL_STATUSES } from "../shared/fixtures";
  7   | 
  8   | test.describe("Schools Management", () => {
> 9   |   test.beforeEach(async ({ page }) => {
      |        ^ Test timeout of 30000ms exceeded while running "beforeEach" hook.
  10  |     await loginAsSuperAdmin(page);
  11  |     await page.goto("/super-admin/schools");
  12  |   });
  13  | 
  14  |   test("1.1 - School creation via onboarding wizard", async ({ page }) => {
  15  |     // Navigate to Add New School tab
  16  |     await page.click('text=Add New School');
  17  | 
  18  |     // Step 1: School Info
  19  |     const school = generateTestSchool();
  20  |     await page.fill('[name="school_name"]', school.name);
  21  |     await page.selectOption('[name="board"]', school.board);
  22  |     await page.fill('[name="city"]', school.city);
  23  |     await page.fill('[name="region"]', school.region);
  24  |     await page.click('text=Next');
  25  | 
  26  |     // Step 2: Principal (invite option)
  27  |     await page.click('text=Send Invite');
  28  |     await page.fill('[name="principal_name"]', "Test Principal");
  29  |     await page.fill('[name="principal_email"]', `principal.${Date.now()}@test.com`);
  30  |     await page.fill('[name="principal_phone"]', "9876543210");
  31  |     await page.click('text=Next');
  32  | 
  33  |     // Step 3: Subscription
  34  |     await page.click('text=Trial');
  35  |     await page.click('text=Next');
  36  | 
  37  |     // Step 4: AI Budget (defaults)
  38  |     await page.click('text=Next');
  39  | 
  40  |     // Step 5: Branding (defaults)
  41  |     await page.click('text=Next');
  42  | 
  43  |     // Step 6: Content (defaults)
  44  |     await page.click('text=Next');
  45  | 
  46  |     // Step 7: Review & Create
  47  |     await page.click('button:has-text("Create School")');
  48  | 
  49  |     // Verify school appears in list
  50  |     await page.waitForSelector(`text=${school.name}`, { timeout: 10000 });
  51  |     await expect(page.locator(`text=${school.name}`).first()).toBeVisible();
  52  |   });
  53  | 
  54  |   test("1.2 - School deactivation", async ({ page }) => {
  55  |     // Select an active school
  56  |     const schoolRow = page.locator("tbody tr").first();
  57  |     await schoolRow.locator("button").first().click();
  58  |     await page.click('text=School Details');
  59  | 
  60  |     // Navigate to Settings tab
  61  |     await page.click('text=Settings');
  62  |     await page.click('text=Deactivate');
  63  | 
  64  |     // Confirm dialog
  65  |     await page.click('button:has-text("Deactivate School")');
  66  | 
  67  |     // Verify status changed
  68  |     await expect(page.locator("text=Deactivated")).toBeVisible();
  69  |   });
  70  | 
  71  |   test("1.3 - School reactivation", async ({ page }) => {
  72  |     // Navigate to deactivated school
  73  |     await page.goto("/super-admin/schools");
  74  |     await page.selectOption('[name="status"]', "deactivated");
  75  |     await page.waitForTimeout(500);
  76  | 
  77  |     // Click on deactivated school
  78  |     const schoolRow = page.locator("tbody tr").first();
  79  |     if (await schoolRow.isVisible()) {
  80  |       await schoolRow.locator("a").first().click();
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
```