import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { setSidebarStore, sidebarStore, toggleRightPanel } from './sidebar';

describe('sidebar store', () => {
	it('toggles the requested right panel and closes it on repeated toggle', () => {
		createRoot((dispose) => {
			setSidebarStore('rightPanel', null);

			toggleRightPanel('rules');
			expect(sidebarStore.rightPanel).toBe('rules');

			toggleRightPanel('dictionary');
			expect(sidebarStore.rightPanel).toBe('dictionary');

			toggleRightPanel('dictionary');
			expect(sidebarStore.rightPanel).toBeNull();

			dispose();
		});
	});
});
