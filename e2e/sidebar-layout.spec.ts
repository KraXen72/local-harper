import { expect, test } from '@playwright/test';
import { openApp } from './helpers';

for (const width of [360, 1280]) {
	test(`dialect footer stays below rules and searches align at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await openApp(page);
		await page.getByRole('button', { name: 'Toggle dictionary manager' }).click();
		const searchTop = await page.getByPlaceholder('Search or add word...').evaluate(el => el.getBoundingClientRect().top);
		await page.getByRole('button', { name: 'Toggle rule manager' }).click();
		const filter = page.getByPlaceholder('Filter rules...');
		expect(await filter.evaluate(el => el.getBoundingClientRect().top)).toBe(searchTop);
		const footer = page.locator('.sidebar-panel-control-row');
		const scroller = page.locator('.sidebar-panel-scroller');
		await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
		expect(await footer.evaluate(el => el.getBoundingClientRect().bottom)).toBe(800);
		expect(await scroller.evaluate(el => el.getBoundingClientRect().bottom))
			.toBe(await footer.evaluate(el => el.getBoundingClientRect().top));
		await filter.fill('no-matching-rule-zzzz');
		await expect(page.getByText('No rules match your filter')).toBeVisible();
		expect(await footer.evaluate(el => el.getBoundingClientRect().bottom)).toBe(800);
		await page.getByLabel('Select dialect').selectOption({ label: 'British English' });
		await expect(page.getByLabel('Select dialect').locator('option:checked')).toHaveText('British English');
	});
}

test('counter adapts as the editor resizes', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await openApp(page);
	const footer = page.locator('.editor-footer');
	await expect(footer).toContainText('Characters:');
	await page.setViewportSize({ width: 800, height: 800 });
	await expect(footer).toContainText('Ch:');
	await page.setViewportSize({ width: 1280, height: 800 });
	await expect(footer).toContainText('Characters:');
	expect(await footer.evaluate(el => el.getBoundingClientRect().height)).toBe(75);
});
