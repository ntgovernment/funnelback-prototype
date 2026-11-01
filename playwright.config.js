import { defineConfig } from "@playwright/test";

const baseURL = `http://127.0.0.1:${process.env.PUBLIC_PORT || 4175}/funnelback-prototype/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/preview-public.js",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
