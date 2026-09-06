import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173/local-harper/';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL,
		screenshot: 'only-on-failure',
		serviceWorkers: 'block',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: process.env.BASE_URL ? undefined : {
		command: 'pnpm serve --host 127.0.0.1 --port 4173',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
	},
});
