import { test as base, Page, BrowserContext, expect } from "@playwright/test";

// Extended fixtures for the test framework
export interface TestFixtures {
  authenticatedPage: Page;
  superAdminPage: Page;
  schoolIds: string[];
  apiBaseUrl: string;
}

// Auth helper for super admin
export async function loginAsSuperAdmin(page: Page) {
  const email = process.env.TEST_SUPER_ADMIN_EMAIL || "admin@lernen.edu";
  const password = process.env.TEST_SUPER_ADMIN_PASSWORD || "testpassword123";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://czhrypodwcjyvfwsofit.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6aHJ5cG9kd2NqeXZmd3NvZml0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDQyMjAsImV4cCI6MjA5MTQyMDIyMH0.H6NigbZxnKYdkXnU410uy5r_f0d6GU5_Nt3t7XmaysE";

  // 1. Get tokens from Supabase auth API
  const authRes = await page.request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    headers: {
      'apikey': anonKey,
      'Content-Type': 'application/json',
    },
    data: { email, password },
  });

  if (authRes.status() !== 200) {
    const text = await authRes.text();
    throw new Error(`Auth API failed: ${authRes.status()} - ${text}`);
  }

  const tokens = await authRes.json() as { access_token: string; refresh_token?: string };
  const { access_token: accessToken, refresh_token: refreshToken } = tokens;

  if (!accessToken) {
    throw new Error("No access token from auth API");
  }

  // 2. Build the cookie value that @supabase/ssr v0.5.2 expects.
  // The cookie name is "supabase.auth.token" and the value is a JSON object
  // with currentSession + expiresAt (base64url encoding is optional for Playwright
  // since we set the cookie directly, not through the server).
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const cookieValue = JSON.stringify({
    currentSession: tokens,
    expiresAt,
  });

  // 3. Set the auth token cookie — httpOnly:false so browser sends it on requests.
  // Cookie name must match what @supabase/ssr v0.5.2 uses: "supabase.auth.token"
  await page.context().addCookies([{
    name: `supabase.auth.token`,
    value: encodeURIComponent(cookieValue),
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }]);

  // 4. Verify the cookie was set
  const cookiesBefore = await page.context().cookies();
  if (!cookiesBefore.find(c => c.name === 'supabase.auth.token')) {
    throw new Error(`Cookie not set! Cookies: ${cookiesBefore.map(c => c.name).join(', ')}`);
  }

  // 5. Navigate to / — NOT /auth/login. If already authenticated, middleware
  // redirects to /super-admin. If not, redirects to /auth/login.
  // We need to be on / to trigger the redirect chain correctly.
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });

  const url = page.url();

  if (url.includes('/super-admin')) {
    return; // Success
  }

  // 6. Check where we ended up
  const cookiesAfter = await page.context().cookies();
  if (!url.includes('/super-admin')) {
    throw new Error(`Login failed — URL: ${url}. Cookies before nav: ${cookiesBefore.map(c => c.name).join(', ')}. Cookies after nav: ${cookiesAfter.map(c => c.name).join(', ')}`);
  }
}

// Create test school data
export function generateTestSchool(overrides: Partial<{
  name: string;
  board: string;
  city: string;
  region: string;
}> = {}) {
  const timestamp = Date.now();
  return {
    name: overrides.name || `Test School ${timestamp}`,
    board: overrides.board || "CBSE",
    city: overrides.city || "Mumbai",
    region: overrides.region || "Maharashtra",
    academic_year: "2026-2027",
  };
}

// Test data for 100 schools scale
export const TEST_SCALE = {
  schools: 100,
  studentsPerSchool: 2000,
  totalStudents: 200000,
  teachersPerSchool: 8,
  classesPerSchool: 6,
};

// School status transitions
export const SCHOOL_STATUSES = {
  PENDING_ONBOARDING: "pending_onboarding",
  TRIAL: "trial",
  ACTIVE: "active",
  EXPIRED: "expired",
  DEACTIVATED: "deactivated",
} as const;

// Permission levels for RBAC testing
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SUPPORT_ADMIN: "support_admin",
  VIEWER: "viewer",
  PRINCIPAL: "principal",
  TEACHER: "teacher",
  STUDENT: "student",
} as const;

// Common assertions
export async function assertSchoolCardVisible(page: Page, schoolName: string) {
  await expect(page.locator(`text=${schoolName}`).first()).toBeVisible();
}

export async function assertNotification(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
}

// Clean up helper
export async function cleanupTestData(page: Page, schoolId: string) {
  // Mark school as deactivated for cleanup
  await page.request.post(`/api/admin/schools/${schoolId}/deactivate`);
}

// Performance threshold helpers
export function assertPerformance(metric: number, threshold: number, name: string) {
  const ratio = metric / threshold;
  if (ratio > 1) {
    throw new Error(`${name} exceeded threshold: ${metric}ms > ${threshold}ms`);
  }
}
