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

// Debug: Log cached entries with prefix
async function logCacheDebug(prefix: string): Promise<void> {
	try {
		const entries = await listPrecache();
		console.log(`[${prefix}] Precache entries (${entries.length}):`, entries);
	} catch (e) {
		console.log(`[${prefix}] Failed to list precache:`, e);
	}
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
				console.log(`[SW] ${event.request.mode} request to ${event.request.url} (offline/constrained)`);
				await logCacheDebug('FETCH');
				
				const cached = await matchFromPrecache(event.request);
				if (cached) {
					console.log(`[SW] ✓ Found in cache: ${event.request.url}`);
					return event.request.mode === 'navigate' ? withCOIHeaders(cached) : cached;
				}
				
				console.log(`[SW] ✗ NOT in cache: ${event.request.url}`);
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
					console.log(`[SW] Network failed, trying precache for ${event.request.url}`);
					await logCacheDebug('OFFLINE-FALLBACK');
					
					const cached = await matchFromPrecache(new Request('/index.html'));
					if (cached) {
						console.log(`[SW] ✓ Found index.html in cache`);
						return withCOIHeaders(cached);
					}
					console.log(`[SW] ✗ index.html NOT in cache`);
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
			const cached = await matchFromPrecache(event.request);
			if (cached) {
				return cached;
			}
			// Try network if not in precache
			try {
				return await fetch(event.request);
			} catch {
				console.log(`[SW] ✗ Not in cache and offline: ${event.request.url}`);
				return new Response('', { status: 404, statusText: 'Not found in cache' });
			}
		})(),
	);
});

// Precache and route all build artifacts (JS, CSS, WASM, assets).
// The manifest is injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

// Log precache contents after installation
self.addEventListener('install', () => {
	console.log('[SW] Installing...');
});

self.addEventListener('activate', () => {
	console.log('[SW] Activated');
	logCacheDebug('ACTIVATE');
});
