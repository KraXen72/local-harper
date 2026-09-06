import { expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

test('persists added dictionary words and rechecks after removal', async ({ page }) => {
	await openApp(page);
	await editor(page).fill('Zorbquux is useful.');
	await expect(page.getByTestId('issue-highlight')).toHaveText('Zorbquux');

	await page.getByTestId('issue-card').click();
	await page.getByRole('option', { name: 'Add to Dictionary', exact: true }).click();
	await expect(page.getByTestId('issue-highlight')).toHaveCount(0);

	await page.getByRole('button', { name: 'Toggle dictionary manager' }).click();
	const dictionaryWord = page.getByTestId('dictionary-word').filter({ hasText: 'Zorbquux' });
	await expect(dictionaryWord).toBeVisible();

	await page.reload();
	await expect(page.getByTestId('app')).toHaveAttribute('data-harper-ready', 'true', {
		timeout: 15_000,
	});
	await editor(page).fill('Zorbquux is useful.');
	await expect(page.getByTestId('issue-highlight')).toHaveCount(0);

	await page.getByRole('button', { name: 'Toggle dictionary manager' }).click();
	await page.getByTestId('dictionary-word').filter({ hasText: 'Zorbquux' })
		.getByRole('button', { name: 'Delete word' }).click();
	await expect(page.getByTestId('issue-highlight')).toHaveText('Zorbquux');
});
