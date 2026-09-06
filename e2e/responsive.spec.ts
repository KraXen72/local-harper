import { expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

test('opens an issue and its suggestions on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await openApp(page);
	await editor(page).fill('This is definately wrong.');
	await expect(page.getByTestId('issue-highlight')).toHaveText('definately');

	await page.getByRole('button', { name: 'Toggle sidebar' }).click();
	await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
	await page.getByTestId('issue-card').click();

	await expect(page.getByRole('listbox', { name: 'Completions' })).toBeVisible();
	await expect(page.getByRole('option', { name: 'definitely', exact: true })).toBeVisible();
});
