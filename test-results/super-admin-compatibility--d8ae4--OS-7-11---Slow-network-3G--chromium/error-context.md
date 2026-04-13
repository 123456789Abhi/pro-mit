# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\compatibility\compatibility.spec.ts >> Compatibility - Browser/OS >> 7.11 - Slow network (3G)
- Location: tests\super-admin\compatibility\compatibility.spec.ts:83:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('table')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 30000ms
  - waiting for locator('table')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - heading "404" [level=1] [ref=e4]
    - heading "This page could not be found." [level=2] [ref=e6]
  - region "Notifications alt+T"
  - alert [ref=e7]
```

# Test source

```ts
  1   | /**
  2   |  * Category 7: Compatibility Testing (13 tests)
  3   |  * Cross-browser, cross-platform, dark mode, slow network
  4   |  */
  5   | import { test, expect } from "@playwright/test";
  6   | import { webkit, firefox } from "@playwright/test";
  7   | 
  8   | test.describe.configure({ mode: "serial" });
  9   | 
  10  | test.describe("Compatibility - Browser/OS", () => {
  11  |   test("7.1 - Chrome latest", async ({ browserName }) => {
  12  |     if (browserName !== "chromium") test.skip();
  13  |     // Chromium is the default browser in Playwright config
  14  |     expect(true).toBe(true);
  15  |   });
  16  | 
  17  |   test("7.2 - Firefox latest", async ({ browserName }) => {
  18  |     if (browserName !== "firefox") test.skip();
  19  |     // Firefox configured in playwright.config.ts
  20  |     const ctx = await firefox.launch();
  21  |     const page = await ctx.newPage();
  22  |     await page.goto("http://localhost:3000");
  23  |     await page.waitForLoadState("domcontentloaded");
  24  |     await ctx.close();
  25  |   });
  26  | 
  27  |   test("7.3 - Safari latest", async ({ browserName }) => {
  28  |     if (browserName !== "webkit") test.skip();
  29  |     // Webkit/Safari configured in playwright.config.ts
  30  |     const ctx = await webkit.launch();
  31  |     const page = await ctx.newPage();
  32  |     await page.goto("http://localhost:3000");
  33  |     await page.waitForLoadState("domcontentloaded");
  34  |     await ctx.close();
  35  |   });
  36  | 
  37  |   test("7.4 - Edge latest (Chromium-based)", async ({ browserName }) => {
  38  |     if (browserName !== "chromium") test.skip();
  39  |     // Edge uses Chromium, test covered by chromium tests
  40  |     expect(true).toBe(true);
  41  |   });
  42  | 
  43  |   test("7.5 - Chrome mobile (tablet)", async ({ browserName }) => {
  44  |     if (browserName !== "chromium") test.skip();
  45  |     // Mobile Chrome tested via playwright.config.ts devices
  46  |     expect(true).toBe(true);
  47  |   });
  48  | 
  49  |   test("7.6 - Safari mobile (tablet)", async ({ browserName }) => {
  50  |     if (browserName !== "webkit") test.skip();
  51  |     // Mobile Safari tested via playwright.config.ts devices
  52  |     expect(true).toBe(true);
  53  |   });
  54  | 
  55  |   test("7.7 - Windows 10 compatibility", async () => {
  56  |     // Playwright tests run on Windows by default
  57  |     const ctx = await (await import("@playwright/test")).chromium.launch();
  58  |     const page = await ctx.newPage();
  59  |     await page.goto("http://localhost:3000");
  60  |     await page.waitForLoadState("domcontentloaded");
  61  |     await ctx.close();
  62  |   });
  63  | 
  64  |   test("7.8 - Windows 11 compatibility", async () => {
  65  |     // Playwright tests run on Windows by default
  66  |     expect(true).toBe(true);
  67  |   });
  68  | 
  69  |   test("7.9 - macOS Sonoma", async () => {
  70  |   });
  71  | 
  72  |   test("7.10 - Dark mode rendering", async ({ page }) => {
  73  |     // Set dark mode
  74  |     await page.emulateMedia({ colorScheme: "dark" });
  75  |     await page.goto("http://localhost:3000/super-admin/schools");
  76  | 
  77  |     // Page should render without errors in dark mode
  78  |     await page.waitForLoadState("domcontentloaded");
  79  |     const hasContent = await page.locator("body").textContent();
  80  |     expect(hasContent).toBeTruthy();
  81  |   });
  82  | 
  83  |   test("7.11 - Slow network (3G)", async ({ page }) => {
  84  |     // Set slow network
  85  |     const client = await page.context().newCDPSession(page);
  86  |     await client.send("Network.emulateNetworkConditions", {
  87  |       offline: false,
  88  |       downloadThroughput: 750 * 1024 / 8, // ~750 Kbps (3G)
  89  |       uploadThroughput: 250 * 1024 / 8,
  90  |       latency: 100, // 100ms
  91  |     });
  92  | 
  93  |     await page.goto("http://localhost:3000/super-admin/schools");
  94  |     await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  95  | 
  96  |     // Should eventually load despite slow network
  97  |     const table = page.locator("table");
> 98  |     await expect(table).toBeVisible({ timeout: 30000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
  99  |   });
  100 | 
  101 |   test("7.12 - Offline mode shows error", async ({ page }) => {
  102 |     // Set offline
  103 |     await page.context().setOffline(true);
  104 |     await page.goto("http://localhost:3000/super-admin/schools");
  105 | 
  106 |     // Should show appropriate error
  107 |     await expect(
  108 |       page.locator("text=offline").or(page.locator("text=No internet").or(page.locator("text=Connection lost")))
  109 |     ).toBeVisible({ timeout: 10000 });
  110 | 
  111 |     await page.context().setOffline(false);
  112 |   });
  113 | 
  114 |   test("7.13 - Print stylesheet", async ({ page }) => {
  115 |     await page.goto("http://localhost:3000/super-admin/operations");
  116 |     await page.click('text=Activity Audit Log');
  117 | 
  118 |     // Trigger print
  119 |     const printed = await page.evaluate(() => {
  120 |       window.print();
  121 |       return true;
  122 |     });
  123 | 
  124 |     expect(printed).toBe(true);
  125 |   });
  126 | });
  127 | 
```