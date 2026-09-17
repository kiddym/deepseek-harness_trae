import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `http://127.0.0.1:${process.env.PORT || 4311}`,
    browserName: 'chromium',
    launchOptions: { executablePath: path.resolve(process.env.PLAYWRIGHT_BROWSERS_PATH || '.pw-browsers', 'chromium-1148/chrome-mac/Chromium.app/Contents/MacOS/Chromium') },
    trace: 'retain-on-failure'
  },
  reporter: [['list'], ['html', { open: 'never' }]]
});
