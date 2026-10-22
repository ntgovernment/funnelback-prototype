import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4175/funnelback-prototype/",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/preview-public.js",
    url: "http://127.0.0.1:4175/funnelback-prototype/",
    reuseExistingServer: !process.env.CI,
  },
});
