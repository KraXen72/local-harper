/// <reference lib="WebWorker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { isOnCellular } from './utils/cellular-check';

declare let self: ServiceWorkerGlobalScope;

// Take control of all clients as soon as the SW activates
self.skipWaiting();
clientsClaim();

// Remove caches from older precache versions
cleanupOutdatedCaches();

// Debug: List all cached entries
async function listPrecache(): Promise<string[]> {
	const cache = await caches.open('workbox-precache-v1');
	const keys = await cache.keys();
	return keys.map(r => r.url);
}

// Generate debug HTML with cache info
async function generateDebugHtml(title: string, message: string, requestedUrl: string): Promise<string> {
	let cacheEntries: string[] = [];
	let allCaches: { name: string; entries: string[] }[] = [];

	try {
		cacheEntries = await listPrecache();
	} catch (e) {
		cacheEntries = [`Error listing precache: ${e}`];
	}

	try {
		const cacheNames = await caches.keys();
		for (const name of cacheNames) {
			const cache = await caches.open(name);
			const keys = await cache.keys();
			allCaches.push({
				name,
				entries: keys.map(r => r.url),
			});
		}
	} catch (e) {
		allCaches = [{ name: 'Error', entries: [String(e)] }];
	}

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${title}</title>
	<style>
		body { font-family: system-ui, sans-serif; padding: 20px; background: #1a1a1a; color: #e0e0e0; }
		h1 { color: #f5a623; }
		p { color: #a0a0a0; }
		h2 { color: #7ed321; margin-top: 30px; }
		pre { background: #2a2a2a; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
		.entry { color: #4a9eff; }
		.count { color: #7ed321; }
	</style>
</head>
<body>
	<h1>${title}</h1>
	<p>${message}</p>
	<h2>Request Info</h2>
	<pre>URL: <span class="entry">${requestedUrl}</span></pre>
	<h2>Precache <span class="count">(${cacheEntries.length} entries)</span></h2>
	<pre>${cacheEntries.map(e => `<span class="entry">${e}</span>`).join('\n')}</pre>
	<h2>All Caches</h2>
	${allCaches.map(c => `
		<h3>${c.name} <span class="count">(${c.entries.length} entries)</span></h3>
		<pre>${c.entries.map(e => `<span class="entry">${e}</span>`).join('\n')}</pre>
	`).join('')}
</body>
</html>`;
}

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

// Match request against precache - try multiple strategies
async function matchFromPrecache(request: Request): Promise<Response | null> {
	const cache = await caches.open('workbox-precache-v1');
	
	// Try exact match first
	let cached = await cache.match(request);
	if (cached) return cached;
	
	// Try without query params
	const url = new URL(request.url);
	url.search = '';
	const noQueryRequest = new Request(url.toString(), { credentials: request.credentials });
	cached = await cache.match(noQueryRequest);
	if (cached) return cached;
	
	// Try just the pathname
	const pathRequest = new Request(url.pathname, { credentials: request.credentials });
	cached = await cache.match(pathRequest);
	if (cached) return cached;
	
	// Try with base URL
	const basePathRequest = new Request(self.location.origin + url.pathname, { credentials: request.credentials });
	cached = await cache.match(basePathRequest);
	if (cached) return cached;
	
	return null;
}

// Handle all fetch requests with proper offline support
self.addEventListener('fetch', (event) => {
	// On constrained network or offline: cache only, no network requests
	if (isOnCellular() || !navigator.onLine) {
		event.respondWith(
			(async () => {
				const cached = await matchFromPrecache(event.request);
				if (cached) {
					return event.request.mode === 'navigate' ? withCOIHeaders(cached) : cached;
				}

				// Not in precache - return debug offline response
				if (event.request.mode === 'navigate') {
					const html = await generateDebugHtml(
						'Data Saver Mode',
						'On constrained network. Content not in cache. Connect to WiFi and reload for fresh content.',
						event.request.url,
					);
					return withCOIHeaders(
						new Response(html, { status: 503, headers: { 'Content-Type': 'text/html' } }),
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
					const cached = await matchFromPrecache(new Request('/index.html'));
					if (cached) {
						return withCOIHeaders(cached);
					}
					// Last resort: debug offline page
					const html = await generateDebugHtml(
						'Offline',
						'No cached version available. Please reconnect and reload.',
						event.request.url,
					);
					return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html' } });
				}
			})(),
		);
		return;
	}

	// Non-navigation requests (JS, CSS, WASM, etc.): cache first
	event.respondWith(
		(async () => {
			const cached = await matchFromPrecache(event.request);
			if (cached) {
				return cached;
			}
			// Try network if not in precache
			try {
				return await fetch(event.request);
			} catch {
				return new Response('', { status: 404, statusText: 'Not found in cache' });
			}
		})(),
	);
});

// Precache and route all build artifacts (JS, CSS, WASM, assets).
// The manifest is injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
