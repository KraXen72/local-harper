import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const buildDate = new Date().toLocaleString('en-UK', {
	month: 'short',
	day: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false,
});

export default defineConfig({
	base: '/local-harper/',
	define: {
		__BUILD_INFO__: JSON.stringify({ hash: commitHash, date: buildDate }),
	},
	plugins: [
		devtools(),
		solidPlugin(),
		tailwindcss(),
		VitePWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.ts',
			injectRegister: 'auto',
			registerType: 'autoUpdate',
			injectManifest: {
				globPatterns: ['**/*'],
				maximumFileSizeToCacheInBytes: 100 * 1024 * 1024,
			},
			manifest: {
				name: 'local-harper',
				short_name: 'local-harper',
				theme_color: '#100f0f',
				background_color: '#100f0f',
				display: 'standalone',
				start_url: '/local-harper/',
				scope: '/local-harper/',
				icons: [
					{
						src: '/local-harper/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/local-harper/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
					},
					{
						src: '/local-harper/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			devOptions: {
				enabled: false,
			},
		}),
	],
	server: {
		port: 3000,
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		},
	},
	build: {
		target: 'esnext',
	},
	optimizeDeps: {
		exclude: ['harper.js'],
	},
	assetsInclude: ['**/*.wasm'],
});
