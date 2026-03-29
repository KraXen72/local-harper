import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

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
	// Restrict sub-resources to same-origin only (required by COEP: require-corp)
	headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

// This listener must be registered BEFORE precacheAndRoute so that it runs
// first and calls event.respondWith() before workbox's listener can.
self.addEventListener('fetch', (event) => {
	if (event.request.mode !== 'navigate') return;

	event.respondWith(
		(async () => {
			// Try network first so we always serve the freshest HTML.
			// On failure (offline), fall back to any cached copy of index.html.
			let response: Response;
			try {
				response = await fetch(event.request);
			} catch {
				const cached =
					(await caches.match('/local-harper/index.html')) ??
					(await caches.match('/local-harper/')) ??
					(await caches.match(event.request));
				if (!cached) {
					return new Response(
						'<h1>Offline</h1><p>No cached version available. Please reconnect and reload.</p>',
						{ status: 503, headers: { 'Content-Type': 'text/html' } },
					);
				}
				response = cached;
			}
			return withCOIHeaders(response);
		})(),
	);
});

// Precache and route all build artifacts (JS, CSS, WASM, assets).
// The manifest is injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
