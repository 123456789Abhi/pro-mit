# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\functional\schools.spec.ts >> Schools Management >> 1.4 - Invite vs direct creation
- Location: tests\super-admin\functional\schools.spec.ts:94:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('text=Send Invite')

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - button "Add New School" [active] [ref=e54] [cursor=pointer]:
            - img [ref=e55]
            - text: Add New School
        - generic [ref=e56]:
          - generic [ref=e57]:
            - button "All Schools" [ref=e58] [cursor=pointer]
            - button "Add New School" [ref=e59] [cursor=pointer]
            - button "School Details" [disabled] [ref=e60]
          - generic [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e65]: "1"
              - generic [ref=e68]: "2"
              - generic [ref=e71]: "3"
              - generic [ref=e74]: "4"
              - generic [ref=e77]: "5"
              - generic [ref=e80]: "6"
              - generic [ref=e83]: "7"
            - generic [ref=e84]:
              - generic [ref=e85]:
                - heading "School Info" [level=3] [ref=e86]
                - paragraph [ref=e87]: Basic school details
              - generic [ref=e89]:
                - generic [ref=e90]:
                  - text: School Name *
                  - textbox "School Name *" [ref=e91]:
                    - /placeholder: Enter school name
                - generic [ref=e92]:
                  - text: Board *
                  - combobox [ref=e93] [cursor=pointer]:
                    - generic: CBSE
                    - img [ref=e94]
                - generic [ref=e96]:
                  - text: Academic Year
                  - textbox "Academic Year" [ref=e97]: 2025-2026
                - generic [ref=e98]:
                  - text: City *
                  - textbox "City *" [ref=e99]:
                    - /placeholder: Enter city
                - generic [ref=e100]:
                  - text: Region *
                  - combobox [ref=e101] [cursor=pointer]:
                    - generic: Select region
                    - img [ref=e102]
            - generic [ref=e104]:
              - button "Previous" [disabled]
              - button "Next" [ref=e105] [cursor=pointer]
  - region "Notifications alt+T"
  - alert [ref=e106]
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
  9   |   test.beforeEach(async ({ page }) => {
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
> 99  |     await page.click('text=Send Invite');
      |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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
  181 |     await page.locator("tbody tr").first().locator("a").first().click();
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
```