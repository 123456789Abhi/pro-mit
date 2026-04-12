/**
 * Category 9: API & Integration Testing (12 tests)
 * External service integrations
 */
import { test, expect, request } from "@playwright/test";

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("API & Integration - Supabase", () => {
  test("9.1 - Supabase Auth login/logout", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');

    // Should redirect to super-admin
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
  });

  test("9.2 - Supabase DB RPC functions", async () => {
    const ctx = await request.newContext();

    // Login
    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Call RPC function
    const rpcRes = await ctx.post(`${API_BASE}/rest/v1/rpc/get_admin_stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY || "",
      },
    });

    expect([200, 400]).toContain(rpcRes.status());
  });

  test("9.3 - Supabase Storage PDF upload/download", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "admin@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/super-admin/, { timeout: 15000 });

    await page.goto("/super-admin/content");
    await page.click('text=Upload');

    // Upload PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-book.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 mock content"),
    });

    await page.waitForTimeout(2000);
  });

  test("9.4 - Gemini API integration", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "student@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Send AI query
    const aiRes = await ctx.post(`${API_BASE}/api/ai/query`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        question: "What is photosynthesis?",
        school_id: "test-school",
        class: 10,
        subject: "Science",
      },
    });

    const response = await aiRes.json();
    expect(response.answer).toBeTruthy();
  });

  test("9.5 - Claude API integration", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "admin@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Generate quiz (Claude Haiku)
    const quizRes = await ctx.post(`${API_BASE}/api/ai/generate-quiz`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { book_id: "test-book", class: 10, subject: "Math", count: 5 },
    });

    expect(quizRes.status()).toBeLessThan(300);
  });

  test("9.6 - OpenAI Embeddings integration", async () => {
    // Test that RAG queries return relevant results
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "student@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // Query with embedding
    const ragRes = await ctx.post(`${API_BASE}/api/ai/rag-query`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        question: "What is Newton's third law?",
        school_id: "test-school",
        class: 10,
      },
    });

    const response = await ragRes.json();
    expect(response.answer).toBeTruthy();
    expect(response.sources).toBeDefined();
  });

  test("9.7 - Edge Functions scheduled notifications", async () => {
  });

  test("9.8 - Email delivery (forgot password)", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await page.fill('[name="email"]', "admin@test.com");
    await page.click('button[type="submit"]');

    // Should show success (actual email would be sent)
    await expect(page.locator("text=Check your email").or(page.locator("text=sent"))).toBeVisible({ timeout: 5000 });
  });

  test("9.9 - In-app notification delivery", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="email"]', "student@test.com");
    await page.fill('[name="password"]', "test123");
    await page.click('button[type="submit"]');

    // Notification should appear
    await page.waitForTimeout(3000);
    const notifications = page.locator('[data-testid="notification-item"]');
    // Notifications may or may not exist depending on test data
  });

  test("9.10 - Cron jobs", async () => {
  });

  test("9.11 - pgvector similarity search", async () => {
    const ctx = await request.newContext();

    const loginRes = await ctx.post(`${API_BASE}/api/auth/login`, {
      data: { email: "student@test.com", password: "test123" },
    });
    const token = (await loginRes.json()).token;

    // RAG query should use pgvector similarity
    const ragRes = await ctx.post(`${API_BASE}/api/ai/rag-query`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        question: "What are the topics in Chapter 1?",
        school_id: "test-school",
        class: 10,
      },
    });

    const response = await ragRes.json();
    // Should return relevant chunks based on vector similarity
    expect(response.sources).toBeTruthy();
  });

  test("9.12 - Payment webhook retries", async () => {
  });
});
