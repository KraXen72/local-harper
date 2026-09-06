import { expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

test('persists disabled rules and rechecks the document', async ({ page }) => {
	await openApp(page);
	await editor(page).fill('This is the the test.');
	await expect(page.getByTestId('issue-highlight')).toHaveAttribute('data-lint-kind', 'Repetition');

	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await page.getByPlaceholder('Filter rules...').fill('Repeated Words');
	const toggle = page.getByRole('checkbox', { name: 'Toggle rule RepeatedWords' });
	await expect(toggle).toBeChecked();
	await toggle.uncheck();
	await expect(page.getByTestId('issue-highlight')).toHaveCount(0);

	await page.reload();
	await expect(page.getByTestId('app')).toHaveAttribute('data-harper-ready', 'true', {
		timeout: 15_000,
	});
	await page.getByRole('button', { name: 'Toggle rule manager' }).click();
	await page.getByPlaceholder('Filter rules...').fill('Repeated Words');
	await expect(page.getByRole('checkbox', { name: 'Toggle rule RepeatedWords' })).not.toBeChecked();

	await page.getByRole('button', { name: 'Close Rule Manager' }).click();
	await editor(page).fill('This is the the test.');
	await expect(page.getByTestId('issue-highlight')).toHaveCount(0);
});
