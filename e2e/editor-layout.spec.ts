import { expect, test } from '@playwright/test';
import { editor, openApp } from './helpers';

for (const width of [360, 800, 1280]) {
	test(`editor footer follows short content and bounds long content at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 });
		await openApp(page);
		const geometry = () => page.evaluate(() => {
			const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
			const surface = rect('.editor-surface');
			const divider = rect('.editor-divider');
			const footer = rect('.editor-footer');
			const scroll = rect('.editor-scroll-region');
			return {
				gap: divider.top - surface.bottom,
				centerDrift: (divider.left + divider.right - surface.left - surface.right) / 2,
				cutoffGap: divider.top - scroll.bottom,
				footerBottom: footer.bottom,
				footerHeight: footer.height,
			};
		});
		await editor(page).fill('Short text.');
		await expect.poll(async () => (await geometry()).gap).toBe(56);
		expect((await geometry()).footerBottom).toBeLessThan(400);

		await editor(page).fill('This is a sentence with enough words to wrap across the editor.\n'.repeat(100) + 'This is definately wrong.');
		await expect(page.getByTestId('issue-card')).toHaveCount(1);
		// A wheel/scrollbar can reach farther than CodeMirror's cursor scrolling.
		await page.locator('.editor-scroll-region').evaluate(el => { el.scrollTop = el.scrollHeight; });
		await expect.poll(geometry).toEqual({
			gap: 56, centerDrift: 0, cutoffGap: 0, footerBottom: 800, footerHeight: 75,
		});
		if (width > 768) {
			expect(await page.locator('.sidebar-footer').evaluate(el => el.getBoundingClientRect().height)).toBe(75);
		}
	});
}
