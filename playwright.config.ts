import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `http://127.0.0.1:${process.env.PORT || 4311}`,
    channel: 'chromium',
    trace: 'retain-on-failure'
  },
  reporter: [['list'], ['html', { open: 'never' }]]
});
