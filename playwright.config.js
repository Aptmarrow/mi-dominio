const { defineConfig, devices } = require('@playwright/test');

const projects = [];

// En CI mantenemos Chromium controlado por Playwright.
if (process.env.CI) {
  projects.push({
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  });
} else {
  // En local usamos Firefox gestionado por Playwright (requiere `npx playwright install firefox`).
  projects.push({
    name: 'firefox',
    use: {
      ...devices['Desktop Firefox'],
      browserName: 'firefox',
    },
  });
}

module.exports = defineConfig({
  testDir: './tests/security',
  timeout: 30_000,
  webServer: {
    command: 'npx http-server . -p 8080 --silent',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects,
});
