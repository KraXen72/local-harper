import { devices, expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

test.use({ ...devices['Pixel 7'] });

test('keeps accepting input after an issue is highlighted', async ({ page }) => {
	await openApp(page);
	await editor(page).pressSequentially('This is definately', { delay: 25 });

	const highlight = page.getByTestId('issue-highlight');
	await expect(highlight).toHaveText('definately');

	await highlight.click();
	await expect(page.getByRole('listbox', { name: 'Completions' })).toBeVisible();
	await editor(page).press('End');
	await editor(page).pressSequentially(' and I can keep typing.', { delay: 25 });

	await expect(editor(page)).toHaveText('This is definately and I can keep typing.');
});
