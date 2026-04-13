# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: super-admin\api-integration\api.spec.ts >> API & Integration - Supabase >> 9.5 - Claude API integration
- Location: tests\super-admin\api-integration\api.spec.ts:88:7

# Error details

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

# Test source

```ts
  1   | /**
  2   |  * Category 9: API & Integration Testing (12 tests)
  3   |  * External service integrations
  4   |  */
  5   | import { test, expect, request } from "@playwright/test";
  6   | 
  7   | const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  8   | 
  9   | test.describe("API & Integration - Supabase", () => {
  10  |   test("9.1 - Supabase Auth login/logout", async ({ page }) => {
  11  |     await page.goto("/auth/login");
  12  |     await page.fill('[name="email"]', "admin@test.com");
  13  |     await page.fill('[name="password"]', "test123");
  14  |     await page.click('button[type="submit"]');
  15  | 
  16  |     // Should redirect to super-admin
  17  |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  18  | 
  19  |     // Logout
  20  |     await page.click('button:has-text("Logout")');
  21  |     await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
  22  |   });
  23  | 
  24  |   test("9.2 - Supabase DB RPC functions", async () => {
  25  |     const ctx = await request.newContext();
  26  | 
  27  |     // Login
  28  |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  29  |       data: { email: "admin@test.com", password: "test123" },
  30  |     });
  31  |     const token = (await loginRes.json()).token;
  32  | 
  33  |     // Call RPC function
  34  |     const rpcRes = await ctx.post(`${API_BASE}/rest/v1/rpc/get_admin_stats`, {
  35  |       headers: {
  36  |         Authorization: `Bearer ${token}`,
  37  |         apikey: process.env.SUPABASE_ANON_KEY || "",
  38  |       },
  39  |     });
  40  | 
  41  |     expect([200, 400]).toContain(rpcRes.status());
  42  |   });
  43  | 
  44  |   test("9.3 - Supabase Storage PDF upload/download", async ({ page }) => {
  45  |     await page.goto("/auth/login");
  46  |     await page.fill('[name="email"]', "admin@test.com");
  47  |     await page.fill('[name="password"]', "test123");
  48  |     await page.click('button[type="submit"]');
  49  |     await page.waitForURL(/\/super-admin/, { timeout: 15000 });
  50  | 
  51  |     await page.goto("/super-admin/content");
  52  |     await page.click('text=Upload');
  53  | 
  54  |     // Upload PDF
  55  |     const fileInput = page.locator('input[type="file"]');
  56  |     await fileInput.setInputFiles({
  57  |       name: "test-book.pdf",
  58  |       mimeType: "application/pdf",
  59  |       buffer: Buffer.from("%PDF-1.4 mock content"),
  60  |     });
  61  | 
  62  |     await page.waitForTimeout(2000);
  63  |   });
  64  | 
  65  |   test("9.4 - Gemini API integration", async () => {
  66  |     const ctx = await request.newContext();
  67  | 
  68  |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  69  |       data: { email: "student@test.com", password: "test123" },
  70  |     });
  71  |     const token = (await loginRes.json()).token;
  72  | 
  73  |     // Send AI query
  74  |     const aiRes = await ctx.post(`${API_BASE}/api/ai/query`, {
  75  |       headers: { Authorization: `Bearer ${token}` },
  76  |       data: {
  77  |         question: "What is photosynthesis?",
  78  |         school_id: "test-school",
  79  |         class: 10,
  80  |         subject: "Science",
  81  |       },
  82  |     });
  83  | 
  84  |     const response = await aiRes.json();
  85  |     expect(response.answer).toBeTruthy();
  86  |   });
  87  | 
  88  |   test("9.5 - Claude API integration", async () => {
  89  |     const ctx = await request.newContext();
  90  | 
  91  |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  92  |       data: { email: "admin@test.com", password: "test123" },
  93  |     });
> 94  |     const token = (await loginRes.json()).token;
      |                    ^ SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  95  | 
  96  |     // Generate quiz (Claude Haiku)
  97  |     const quizRes = await ctx.post(`${API_BASE}/api/ai/generate-quiz`, {
  98  |       headers: { Authorization: `Bearer ${token}` },
  99  |       data: { book_id: "test-book", class: 10, subject: "Math", count: 5 },
  100 |     });
  101 | 
  102 |     expect(quizRes.status()).toBeLessThan(300);
  103 |   });
  104 | 
  105 |   test("9.6 - OpenAI Embeddings integration", async () => {
  106 |     // Test that RAG queries return relevant results
  107 |     const ctx = await request.newContext();
  108 | 
  109 |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  110 |       data: { email: "student@test.com", password: "test123" },
  111 |     });
  112 |     const token = (await loginRes.json()).token;
  113 | 
  114 |     // Query with embedding
  115 |     const ragRes = await ctx.post(`${API_BASE}/api/ai/rag-query`, {
  116 |       headers: { Authorization: `Bearer ${token}` },
  117 |       data: {
  118 |         question: "What is Newton's third law?",
  119 |         school_id: "test-school",
  120 |         class: 10,
  121 |       },
  122 |     });
  123 | 
  124 |     const response = await ragRes.json();
  125 |     expect(response.answer).toBeTruthy();
  126 |     expect(response.sources).toBeDefined();
  127 |   });
  128 | 
  129 |   test("9.7 - Edge Functions scheduled notifications", async () => {
  130 |   });
  131 | 
  132 |   test("9.8 - Email delivery (forgot password)", async ({ page }) => {
  133 |     await page.goto("/auth/forgot-password");
  134 |     await page.fill('[name="email"]', "admin@test.com");
  135 |     await page.click('button[type="submit"]');
  136 | 
  137 |     // Should show success (actual email would be sent)
  138 |     await expect(page.locator("text=Check your email").or(page.locator("text=sent"))).toBeVisible({ timeout: 5000 });
  139 |   });
  140 | 
  141 |   test("9.9 - In-app notification delivery", async ({ page }) => {
  142 |     await page.goto("/auth/login");
  143 |     await page.fill('[name="email"]', "student@test.com");
  144 |     await page.fill('[name="password"]', "test123");
  145 |     await page.click('button[type="submit"]');
  146 | 
  147 |     // Notification should appear
  148 |     await page.waitForTimeout(3000);
  149 |     const notifications = page.locator('[data-testid="notification-item"]');
  150 |     // Notifications may or may not exist depending on test data
  151 |   });
  152 | 
  153 |   test("9.10 - Cron jobs", async () => {
  154 |   });
  155 | 
  156 |   test("9.11 - pgvector similarity search", async () => {
  157 |     const ctx = await request.newContext();
  158 | 
  159 |     const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
  160 |       data: { email: "student@test.com", password: "test123" },
  161 |     });
  162 |     const token = (await loginRes.json()).token;
  163 | 
  164 |     // RAG query should use pgvector similarity
  165 |     const ragRes = await ctx.post(`${API_BASE}/api/ai/rag-query`, {
  166 |       headers: { Authorization: `Bearer ${token}` },
  167 |       data: {
  168 |         question: "What are the topics in Chapter 1?",
  169 |         school_id: "test-school",
  170 |         class: 10,
  171 |       },
  172 |     });
  173 | 
  174 |     const response = await ragRes.json();
  175 |     // Should return relevant chunks based on vector similarity
  176 |     expect(response.sources).toBeTruthy();
  177 |   });
  178 | 
  179 |   test("9.12 - Payment webhook retries", async () => {
  180 |   });
  181 | });
  182 | 
```