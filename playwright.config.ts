import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import path from 'node:path';

const artifactDir = process.env.TEST_ARTIFACT_DIR || path.join(tmpdir(), `wp05-task-app-test-${process.env.TEST_PORT || 4311}`, 'artifacts');

export default defineConfig({
  testDir: './tests',
  outputDir: path.join(artifactDir, 'test-results'),
  use: {
    baseURL: `http://127.0.0.1:${process.env.PORT || 4311}`,
    channel: 'chromium',
    trace: 'retain-on-failure'
  },
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(artifactDir, 'playwright-report') }]]
});
