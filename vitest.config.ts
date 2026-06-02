import { defineConfig } from 'vitest/config';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
	define: {
		__BUILD_INFO__: JSON.stringify({ hash: 'test', date: 'test' }),
	},
	plugins: [solidPlugin()],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{ts,tsx}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
		},
	},
});
