import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

test('uses the system theme and persists an explicit preference', async ({ page }) => {
	await page.emulateMedia({ colorScheme: 'light' });
	await openApp(page);
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await expect(page.getByRole('radio', { name: 'System theme' })).toHaveAttribute('aria-checked', 'true');
	const dialect = page.getByRole('combobox', { name: 'Select dialect' });
	await expect(dialect).toHaveCSS('background-color', 'rgb(255, 252, 240)');
	await dialect.hover();
	await expect(dialect).toHaveCSS('background-color', 'rgb(255, 252, 240)');
	await expect(page.getByRole('button', { name: 'Toggle rule manager' })).toHaveCSS('color', 'rgb(255, 252, 240)');
	await expect(page.getByRole('button', { name: 'Toggle dictionary manager' })).toHaveCSS('background-color', 'rgb(183, 181, 172)');
	await expect(page.getByRole('button', { name: 'Toggle dictionary manager' })).toHaveCSS('color', 'rgb(16, 15, 15)');
	await page.getByRole('button', { name: 'Toggle rule manager' }).evaluate(button => button.blur());
	await expect(page.getByRole('button', { name: 'Toggle rule manager' })).toHaveCSS('box-shadow', 'none');

	await page.getByRole('radio', { name: 'Dark theme' }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(page.locator('html')).not.toHaveAttribute('data-theme-changing', '');
	await expect(page.getByTestId('app')).toHaveCSS('background-color', 'rgb(16, 15, 15)');
	await expect.poll(() => page.evaluate(() => localStorage.getItem('harper-theme'))).toBe('dark');

	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await expect(page.getByRole('radio', { name: 'Dark theme' })).toHaveAttribute('aria-checked', 'true');
});

test('tracks OS changes in system mode and remains usable on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ colorScheme: 'dark' });
	await openApp(page);
	await page.getByRole('button', { name: 'Toggle rule manager' }).click();

	const themePicker = page.getByRole('radiogroup', { name: 'Theme' });
	await expect(themePicker).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Select dialect' })).toHaveCSS('background-color', 'rgb(16, 15, 15)');
	await expect(page.getByRole('button', { name: 'Toggle rule manager' })).toHaveCSS('color', 'rgb(255, 252, 240)');
	await expect(page.getByRole('button', { name: 'Toggle dictionary manager' })).toHaveCSS('color', 'rgb(255, 252, 240)');
	await expect(page.getByRole('radio', { name: 'System theme' })).toHaveCSS('background-color', 'rgb(64, 62, 60)');
	await expect(page.getByRole('combobox', { name: 'Select dialect' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

	await page.emulateMedia({ colorScheme: 'light' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await expect(themePicker).toBeInViewport();
});
