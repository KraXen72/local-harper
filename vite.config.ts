import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  base: '/local-harper/',
  plugins: [devtools(), solidPlugin(), tailwindcss()],
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
	worker: {
		format: 'es'
	},
  optimizeDeps: {
    exclude: ['harper.js'],
  },
  assetsInclude: ['**/*.wasm'],
});
