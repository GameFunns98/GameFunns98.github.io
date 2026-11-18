import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4321';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL, browserName: 'chromium', viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4321',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
