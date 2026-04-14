# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\functional\schools.spec.ts >> Schools Management >> 1.6 - School search functionality
- Location: tests\super-admin\functional\schools.spec.ts:145:7

# Error details

```
Error: Login failed — URL: http://localhost:3000/auth/login. Cookies before nav: __cf_bm, supabase.auth.token. Cookies after nav: __cf_bm, supabase.auth.token
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e6]
      - heading "Lernen" [level=1] [ref=e9]
      - paragraph [ref=e10]: Sign in to your admin panel
    - generic [ref=e12]:
      - generic [ref=e13]:
        - text: Email address
        - generic [ref=e14]:
          - img
          - textbox "Email address" [ref=e15]:
            - /placeholder: you@example.com
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Password
          - link "Forgot password?" [ref=e19] [cursor=pointer]:
            - /url: /auth/reset-password
        - generic [ref=e20]:
          - img
          - textbox "Password" [ref=e21]:
            - /placeholder: ••••••••
          - button "Show password" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
      - button "Sign in" [ref=e26] [cursor=pointer]
    - paragraph [ref=e27]: Powered by Lernen EdTech
  - region "Notifications alt+T"
  - alert [ref=e28]
```

# Test source

```ts
  1   | import { test as base, Page, BrowserContext, expect } from "@playwright/test";
  2   | 
  3   | // Extended fixtures for the test framework
  4   | export interface TestFixtures {
  5   |   authenticatedPage: Page;
  6   |   superAdminPage: Page;
  7   |   schoolIds: string[];
  8   |   apiBaseUrl: string;
  9   | }
  10  | 
  11  | // Auth helper for super admin
  12  | export async function loginAsSuperAdmin(page: Page) {
  13  |   const email = process.env.TEST_SUPER_ADMIN_EMAIL || "admin@lernen.edu";
  14  |   const password = process.env.TEST_SUPER_ADMIN_PASSWORD || "testpassword123";
  15  |   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://czhrypodwcjyvfwsofit.supabase.co";
  16  |   const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDQyMjAsImV4cCI6MjA5MTQyMDIyMH0.H6NigbZxnKYdkXnU410uy5r_f0d6GU5_Nt3t7XmaysE";
  17  | 
  18  |   // 1. Get tokens from Supabase auth API
  19  |   const authRes = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  20  |     headers: {
  21  |       'apikey': anonKey,
  22  |       'Content-Type': 'application/json',
  23  |     },
  24  |     data: { email, password },
  25  |   });
  26  | 
  27  |   if (authRes.status() !== 200) {
  28  |     const text = await authRes.text();
  29  |     throw new Error(`Auth API failed: ${authRes.status()} - ${text}`);
  30  |   }
  31  | 
  32  |   const tokens = await authRes.json() as { access_token: string; refresh_token?: string };
  33  |   const { access_token: accessToken, refresh_token: refreshToken } = tokens;
  34  | 
  35  |   if (!accessToken) {
  36  |     throw new Error("No access token from auth API");
  37  |   }
  38  | 
  39  |   // 2. Build the cookie value that @supabase/ssr v0.5.2 expects.
  40  |   // The cookie name is "supabase.auth.token" and the value is a JSON object
  41  |   // with currentSession + expiresAt (base64url encoding is optional for Playwright
  42  |   // since we set the cookie directly, not through the server).
  43  |   const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  44  |   const cookieValue = JSON.stringify({
  45  |     currentSession: tokens,
  46  |     expiresAt,
  47  |   });
  48  | 
  49  |   // 3. Set the auth token cookie — httpOnly:false so browser sends it on requests.
  50  |   // Cookie name must match what @supabase/ssr v0.5.2 uses: "supabase.auth.token"
  51  |   await page.context().addCookies([{
  52  |     name: `supabase.auth.token`,
  53  |     value: encodeURIComponent(cookieValue),
  54  |     domain: "localhost",
  55  |     path: "/",
  56  |     httpOnly: false,
  57  |     secure: false,
  58  |     sameSite: "Lax",
  59  |   }]);
  60  | 
  61  |   // 4. Verify the cookie was set
  62  |   const cookiesBefore = await page.context().cookies();
  63  |   if (!cookiesBefore.find(c => c.name === 'supabase.auth.token')) {
  64  |     throw new Error(`Cookie not set! Cookies: ${cookiesBefore.map(c => c.name).join(', ')}`);
  65  |   }
  66  | 
  67  |   // 5. Navigate to / — NOT /auth/login. If already authenticated, middleware
  68  |   // redirects to /super-admin. If not, redirects to /auth/login.
  69  |   // We need to be on / to trigger the redirect chain correctly.
  70  |   await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  71  | 
  72  |   const url = page.url();
  73  | 
  74  |   if (url.includes('/super-admin')) {
  75  |     return; // Success
  76  |   }
  77  | 
  78  |   // 6. Check where we ended up
  79  |   const cookiesAfter = await page.context().cookies();
  80  |   if (!url.includes('/super-admin')) {
> 81  |     throw new Error(`Login failed — URL: ${url}. Cookies before nav: ${cookiesBefore.map(c => c.name).join(', ')}. Cookies after nav: ${cookiesAfter.map(c => c.name).join(', ')}`);
      |           ^ Error: Login failed — URL: http://localhost:3000/auth/login. Cookies before nav: __cf_bm, supabase.auth.token. Cookies after nav: __cf_bm, supabase.auth.token
  82  |   }
  83  | }
  84  | 
  85  | // Create test school data
  86  | export function generateTestSchool(overrides: Partial<{
  87  |   name: string;
  88  |   board: string;
  89  |   city: string;
  90  |   region: string;
  91  | }> = {}) {
  92  |   const timestamp = Date.now();
  93  |   return {
  94  |     name: overrides.name || `Test School ${timestamp}`,
  95  |     board: overrides.board || "CBSE",
  96  |     city: overrides.city || "Mumbai",
  97  |     region: overrides.region || "Maharashtra",
  98  |     academic_year: "2026-2027",
  99  |   };
  100 | }
  101 | 
  102 | // Test data for 100 schools scale
  103 | export const TEST_SCALE = {
  104 |   schools: 100,
  105 |   studentsPerSchool: 2000,
  106 |   totalStudents: 200000,
  107 |   teachersPerSchool: 8,
  108 |   classesPerSchool: 6,
  109 | };
  110 | 
  111 | // School status transitions
  112 | export const SCHOOL_STATUSES = {
  113 |   PENDING_ONBOARDING: "pending_onboarding",
  114 |   TRIAL: "trial",
  115 |   ACTIVE: "active",
  116 |   EXPIRED: "expired",
  117 |   DEACTIVATED: "deactivated",
  118 | } as const;
  119 | 
  120 | // Permission levels for RBAC testing
  121 | export const ROLES = {
  122 |   SUPER_ADMIN: "super_admin",
  123 |   SUPPORT_ADMIN: "support_admin",
  124 |   VIEWER: "viewer",
  125 |   PRINCIPAL: "principal",
  126 |   TEACHER: "teacher",
  127 |   STUDENT: "student",
  128 | } as const;
  129 | 
  130 | // Common assertions
  131 | export async function assertSchoolCardVisible(page: Page, schoolName: string) {
  132 |   await expect(page.locator(`text=${schoolName}`).first()).toBeVisible();
  133 | }
  134 | 
  135 | export async function assertNotification(page: Page, message: string) {
  136 |   await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
  137 | }
  138 | 
  139 | // Clean up helper
  140 | export async function cleanupTestData(page: Page, schoolId: string) {
  141 |   // Mark school as deactivated for cleanup
  142 |   await page.request.post(`/api/admin/schools/${schoolId}/deactivate`);
  143 | }
  144 | 
  145 | // Performance threshold helpers
  146 | export function assertPerformance(metric: number, threshold: number, name: string) {
  147 |   const ratio = metric / threshold;
  148 |   if (ratio > 1) {
  149 |     throw new Error(`${name} exceeded threshold: ${metric}ms > ${threshold}ms`);
  150 |   }
  151 | }
  152 | 
```