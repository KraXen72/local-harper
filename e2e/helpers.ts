import { expect, type Page } from '@playwright/test';

export async function openApp(page: Page) {
	await page.goto('./');
	await expect(page.getByTestId('app')).toHaveAttribute('data-harper-ready', 'true', {
		timeout: 15_000,
	});
}

export function editor(page: Page) {
	return page.getByRole('textbox');
}
