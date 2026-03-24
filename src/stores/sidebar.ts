import { createStore } from 'solid-js/store';

export type RightPanel = 'rules' | 'dictionary' | null;

type SidebarState = {
	isIssueSidebarOpen: boolean;
	rightPanel: RightPanel;
};

export const [sidebarStore, setSidebarStore] = createStore<SidebarState>({
	isIssueSidebarOpen: false,
	rightPanel: null,
});

export function toggleRightPanel(panel: Exclude<RightPanel, null>): void {
	setSidebarStore('rightPanel', current => current === panel ? null : panel);
}
