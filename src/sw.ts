/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { isOnCellular } from './utils/cellular-check';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Precache and route all build artifacts.
// Handles ignoreSearch, index.html fallback, etc. automatically.
precacheAndRoute(self.__WB_MANIFEST);

// ─── COEP / COOP header injection ─────────────────────────────────────────
// GitHub Pages doesn't send these headers, but SharedArrayBuffer (needed for
// WASM threading in harper.js) requires cross-origin isolation. The SW
// rewrites every navigation response with the required headers.
// ──────────────────────────────────────────────────────────────────────────

function withCOIHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

self.addEventListener('fetch', (event) => {
	const { request } = event;

	// Only intercept navigation requests for COI headers + cellular check.
	// Everything else (JS, WASM, CSS, fonts) is handled by precacheAndRoute.
	if (request.mode !== 'navigate') return;

	event.respondWith(
		(async () => {
			// On cellular: serve the cached page without hitting the network.
			if (isOnCellular()) {
				const cached = await caches.match(request, { ignoreSearch: true });
				if (cached) return withCOIHeaders(cached);
			}

			// Normal: network first, cache fallback.
			try {
				return withCOIHeaders(await fetch(request));
			} catch {
				const cached = await caches.match(request, { ignoreSearch: true });
				return cached
					? withCOIHeaders(cached)
					: new Response('Offline', { status: 503 });
			}
		})(),
	);
});
