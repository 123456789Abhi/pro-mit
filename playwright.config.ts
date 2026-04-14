import { defineConfig, devices } from "@playwright/test";

// Detect Windows N edition (lacks Media Foundation — Firefox needs it)
const isWindowsN = process.platform === "win32" && !process.env.WindowsMediaFoundation;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-results.json" }],
  ],
  // Run seed script once before all tests (uses .mjs to avoid tsx CJS/top-level-await issue)
  globalSetup: "./scripts/seed-test-data.mjs",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Skip Firefox on Windows N — it requires Media Feature Pack which isn't installed
    ...(isWindowsN
      ? []
      : [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }]),
    // WebKit not available on Windows — skip
    ...(process.platform !== "win32"
      ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }]
      : []),
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
