import { test as base, Page, expect } from "@playwright/test";

// Extended fixtures for the test framework
export interface TestFixtures {
  authenticatedPage: Page;
  superAdminPage: Page;
  schoolIds: string[];
  apiBaseUrl: string;
}

// Auth helper for super admin — navigates to the test-auth API route.
// The route is excluded from middleware (pathname.startsWith("/api")).
// It signs in via Supabase and redirects to the target panel with a valid JWT cookie.
// Subsequent requests work because the cookie contains a real JWT that getUser() validates.
export async function loginAsSuperAdmin(page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  await page.goto(`${baseUrl}/api/auth/test-auth?role=super_admin`, {
    waitUntil: "networkidle",
  });

  const url = page.url();

  if (!url.includes("/super-admin")) {
    const error = new URL(url).searchParams.get("error");
    if (error) {
      throw new Error(`Test login failed: ${error}. URL: ${url}`);
    }
    throw new Error(
      `Test login failed — expected /super-admin in URL but got: ${url}`
    );
  }
}

// Auth helper for principal role
export async function loginAsPrincipal(page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  await page.goto(`${baseUrl}/api/auth/test-auth?role=principal`, {
    waitUntil: "networkidle",
  });

  const url = page.url();
  if (!url.includes("/principal")) {
    throw new Error(
      `Principal login failed — expected /principal in URL but got: ${url}`
    );
  }
}

// Auth helper for teacher role
export async function loginAsTeacher(page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  await page.goto(`${baseUrl}/api/auth/test-auth?role=teacher`, {
    waitUntil: "networkidle",
  });

  const url = page.url();
  if (!url.includes("/teacher")) {
    throw new Error(
      `Teacher login failed — expected /teacher in URL but got: ${url}`
    );
  }
}

// Auth helper for student role
export async function loginAsStudent(page: Page) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  await page.goto(`${baseUrl}/api/auth/test-auth?role=student`, {
    waitUntil: "networkidle",
  });

  const url = page.url();
  if (!url.includes("/student")) {
    throw new Error(
      `Student login failed — expected /student in URL but got: ${url}`
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
