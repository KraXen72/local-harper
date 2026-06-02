/* @vitest-environment happy-dom */

import { afterEach, describe, expect, it } from 'vitest';
import { getNetworkHints, isOnCellular } from './cellular-check';

type TestConnection = {
	type?: string;
	effectiveType?: string;
	saveData?: boolean;
	downlink?: number;
};

function setNavigatorValue<K extends keyof Navigator>(key: K, value: Navigator[K]): void {
	Object.defineProperty(navigator, key, {
		configurable: true,
		value,
	});
}

function setConnection(key: 'connection' | 'mozConnection' | 'webkitConnection', value: TestConnection | undefined): void {
	Object.defineProperty(navigator, key, {
		configurable: true,
		value,
	});
}

describe('network hints', () => {
	afterEach(() => {
		setConnection('connection', undefined);
		setConnection('mozConnection', undefined);
		setConnection('webkitConnection', undefined);
		setNavigatorValue('onLine', true);
	});

	it('handles missing Network Information API data', () => {
		setConnection('connection', undefined);
		setNavigatorValue('onLine', false);

		expect(getNetworkHints()).toEqual({
			online: false,
			type: 'unknown',
			effectiveType: 'unknown',
			saveData: false,
			downlink: null,
			isLikelyConstrained: false,
		});
		expect(isOnCellular()).toBe(false);
	});

	it.each(['slow-2g', '2g', '3g'])('treats %s as constrained', (effectiveType) => {
		setConnection('connection', { effectiveType, downlink: 0.4 });

		expect(getNetworkHints().isLikelyConstrained).toBe(true);
		expect(isOnCellular()).toBe(true);
	});

	it('treats data saver as constrained', () => {
		setConnection('connection', { saveData: true, effectiveType: '4g', downlink: 10 });

		expect(getNetworkHints()).toMatchObject({
			effectiveType: '4g',
			saveData: true,
			downlink: 10,
			isLikelyConstrained: true,
		});
	});

	it('does not treat 4g alone as constrained', () => {
		setConnection('connection', { type: 'cellular', effectiveType: '4g', saveData: false });

		expect(getNetworkHints().isLikelyConstrained).toBe(false);
	});

	it('uses vendor-prefixed connection fields', () => {
		setConnection('mozConnection', { effectiveType: '3g' });

		expect(getNetworkHints().effectiveType).toBe('3g');
		expect(getNetworkHints().isLikelyConstrained).toBe(true);
	});
});
