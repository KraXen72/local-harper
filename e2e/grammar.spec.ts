import { expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

test('detects, presents, and applies a spelling suggestion', async ({ page }) => {
	await openApp(page);
	await editor(page).fill('This is definately wrong.');

	const highlight = page.getByTestId('issue-highlight');
	await expect(highlight).toHaveText('definately');
	await expect(highlight).toHaveAttribute('data-lint-kind', 'Spelling');
	await expect(page.getByTestId('issue-card')).toHaveCount(1);
	await expect(page.getByTestId('word-count')).toHaveText('Words: 4');

	await page.getByTestId('issue-card').click();
	await page.getByRole('option', { name: 'definitely', exact: true }).click();

	await expect(editor(page)).toHaveText('This is definitely wrong.');
	await expect(highlight).toHaveCount(0);
});

test('does not show stale results after rapid edits', async ({ page }) => {
	await openApp(page);
	await editor(page).fill('This is definately wrong.');
	await editor(page).fill('This is seperate now.');

	const highlights = page.getByTestId('issue-highlight');
	await expect(highlights).toHaveCount(1);
	await expect(highlights).toHaveText('seperate');
	await expect(page.getByText('definately', { exact: true })).toHaveCount(0);
});

test('navigates to an issue and applies its suggestion with the keyboard', async ({ page }) => {
	await openApp(page);
	await editor(page).fill('This is definately seperate.');
	await expect(page.getByTestId('issue-highlight')).toHaveCount(2);

	await editor(page).press('Control+j');
	await expect(page.getByRole('listbox', { name: 'Completions' })).toBeVisible();
	const suggestion = page.getByRole('option', { name: 'definitely', exact: true });
	await expect(suggestion).toBeVisible();
	await page.keyboard.press('ArrowDown');
	await expect(suggestion).toHaveAttribute('aria-selected', 'true');
	await page.keyboard.press('Enter');

	await expect(editor(page)).toHaveText('This is definitely seperate.');
	await expect(page.getByTestId('issue-highlight')).toHaveCount(1);
});
