import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('supports system, light, and dark preferences', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await openApp(page);

	const app = page.getByTestId('app');
	const themeToggle = page.getByTestId('theme-toggle');

	await expect(app).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await expect(themeToggle).toBeVisible();
	await expect(themeToggle.getByRole('radio')).toHaveCount(3);

	await page.getByRole('radio', { name: 'Dark theme' }).click();
	await expect(app).toHaveAttribute('data-theme-preference', 'dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.evaluate(() => localStorage.getItem('harper-theme'))).resolves.toBe('dark');

	await page.reload();
	await openApp(page);
	await expect(app).toHaveAttribute('data-theme-preference', 'dark');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await page.getByRole('radio', { name: 'System theme' }).click();
	await expect(app).toHaveAttribute('data-theme-preference', 'system');
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await page.emulateMedia({ colorScheme: 'dark' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
