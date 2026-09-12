import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('navigates theme choices with arrow keys and a single Tab stop', async ({ page }) => {
	await openApp(page);
	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	const system = page.getByRole('radio', { name: 'System theme' });
	await system.focus();
	for (const [key, theme] of [
		['ArrowRight', 'Light'], ['ArrowDown', 'Dark'],
		['ArrowRight', 'System'], ['ArrowLeft', 'Dark'], ['ArrowUp', 'Light'],
	]) {
		await page.keyboard.press(key);
		const selected = page.getByRole('radio', { name: `${theme} theme` });
		await expect(selected).toBeFocused();
		await expect(selected).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByTestId('app')).toHaveAttribute('data-theme-preference', theme.toLowerCase());
	}
	await page.keyboard.press('Tab');
	await expect(page.getByRole('button', { name: 'Close Rule Manager' })).toBeFocused();
	await page.keyboard.press('Shift+Tab');
	await expect(page.getByRole('radio', { name: 'Light theme' })).toBeFocused();
});

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
