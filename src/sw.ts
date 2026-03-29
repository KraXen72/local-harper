/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { isOnCellular } from './utils/cellular-check';

declare let self: ServiceWorkerGlobalScope;

// Take control of all clients as soon as the SW activates
self.skipWaiting();
clientsClaim();

// Remove caches from older precache versions
cleanupOutdatedCaches();

// ─── COEP / COOP header injection ────────────────────────────────────────────
//
// GitHub Pages does not send Cross-Origin-Embedder-Policy or
// Cross-Origin-Opener-Policy headers.  harper.js needs SharedArrayBuffer
// (WASM threading), which requires cross-origin isolation.  Once this SW is
// active, it intercepts every navigation request (HTML page load) and rewrites
// the response with the required headers so the browser treats the page as
// cross-origin isolated from the second load onward.
//
// Sub-resources (JS, WASM, CSS, …) are served from the precache and are
// same-origin by definition, so they pass COEP automatically.
// ─────────────────────────────────────────────────────────────────────────────

function withCOIHeaders(response: Response): Response {
	const headers = new Headers(response.headers);
	headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	headers.set('Cross-Origin-Resource-Policy', 'same-origin'); // required by COEP: require-corp
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

// Handle all fetch requests with proper offline support
self.addEventListener('fetch', (event) => {
	// On constrained network: cache only, no network requests
	if (isOnCellular()) {
		event.respondWith(
			(async () => {
				const cached = await matchPrecache(event.request);
				if (cached) {
					return event.request.mode === 'navigate' ? withCOIHeaders(cached) : cached;
				}
				// Not in precache - return offline response
				if (event.request.mode === 'navigate') {
					return withCOIHeaders(
						new Response(
							'<h1>Data Saver Mode</h1><p>On constrained network. Connect to WiFi and reload for fresh content.</p>',
							{ status: 503, headers: { 'Content-Type': 'text/html' } },
						),
					);
				}
				return new Response('', { status: 404, statusText: 'Not cached' });
			})(),
		);
		return;
	}

	// Navigation requests: network first with offline fallback
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const response = await fetch(event.request);
					return withCOIHeaders(response);
				} catch {
					// Offline: try to find index.html in precache
					const cached = await matchPrecache('/index.html');
					if (cached) {
						return withCOIHeaders(cached);
					}
					// Last resort: offline page
					return new Response(
						'<h1>Offline</h1><p>No cached version available. Please reconnect and reload.</p>',
						{ status: 503, headers: { 'Content-Type': 'text/html' } },
					);
				}
			})(),
		);
		return;
	}

	// Non-navigation requests (JS, CSS, WASM, etc.): cache first
	event.respondWith(
		(async () => {
			// Try cache first using the full request
			const cached = await matchPrecache(event.request);
			if (cached) {
				return cached;
			}
			// Try network if not in precache
			try {
				return await fetch(event.request);
			} catch {
				// Offline and not cached
				return new Response('', { status: 404, statusText: 'Not found in cache' });
			}
		})(),
	);
});

// Precache and route all build artifacts (JS, CSS, WASM, assets).
// The manifest is injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
