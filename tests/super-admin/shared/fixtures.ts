import { test as base, Page, expect } from "@playwright/test";

// Extended fixtures for the test framework
export interface TestFixtures {
  authenticatedPage: Page;
  superAdminPage: Page;
  schoolIds: string[];
  apiBaseUrl: string;
}

// Auth helper for super admin — uses the test login route which sets
// the auth cookie with correct base64-URL encoding that @supabase/ssr v0.5.2 expects.
// The route signs in via Supabase Auth and the onAuthStateChange callback sets
// the cookie via applyServerStorage() with the base64- prefix, matching what
// createServerClient.getItem() looks for in middleware.
export async function loginAsSuperAdmin(page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Navigate to the test login route — this signs in and sets the cookie
  // with correct encoding via onAuthStateChange → applyServerStorage()
  await page.goto(`${baseUrl}/api/auth/test-login?role=super_admin`, {
    waitUntil: "networkidle",
  });

  const url = page.url();

  if (!url.includes("/super-admin")) {
    // Check for error in URL
    const error = new URL(url).searchParams.get("error");
    if (error) {
      throw new Error(`Test login failed: ${error}. URL: ${url}`);
    }
    throw new Error(
      `Test login failed — expected /super-admin in URL but got: ${url}`
    );
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
