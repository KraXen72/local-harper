/* @refresh reload */
import './index.css';
import { render } from 'solid-js/web';
import 'solid-devtools';
import { registerSW } from 'virtual:pwa-register';
import { isOnCellular } from './utils/cellular-check';

import App from './App';

// Auto-update SW when new version is available (but not on constrained networks)
const updateSW = registerSW({
	onNeedRefresh() {
		// Skip update if on cellular/constrained network
		if (isOnCellular()) {
			console.log('[PWA] Update available, skipping on constrained network');
			return;
		}
		// Auto-reload without prompting
		updateSW(true);
	},
});

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
	);
}

render(() => <App />, root!);
