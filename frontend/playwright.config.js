import { defineConfig } from '@playwright/test';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('Set TEST_DATABASE_URL to an isolated local obal_test database');
const database = new URL(testUrl);
if (!/^\/obal_test(?:_\w+)?$/.test(database.pathname) || !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname)) {
  throw new Error('Browser tests require a local, isolated obal_test database');
}
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 60000, fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5175', viewport: { width: 390, height: 844 },
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node ../backend/scripts/serveE2e.js', url: 'http://127.0.0.1:3301/api/health', reuseExistingServer: false,
      env: { NODE_ENV: 'test', DATABASE_URL: testUrl, DIRECT_URL: testUrl, TEST_DATABASE_URL: testUrl,
        JWT_SECRET: 'isolated-e2e-only-secret-at-least-32-characters', CORS_ORIGIN: 'http://127.0.0.1:5175',
        DEMO_MODE: 'false', SUPPORT_BOT_TOKEN: '', SUPPORT_WEBHOOK_SECRET: '' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: false,
      env: { VITE_API_URL: 'http://127.0.0.1:3301' } },
  ],
});
