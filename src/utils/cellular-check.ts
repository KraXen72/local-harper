export interface NetworkHints {
	online: boolean;
	type: string;
	effectiveType: string;
	saveData: boolean;
	downlink: number | null;
	isLikelyConstrained: boolean;
}

/**
 * Get network connection hints from the Network Information API.
 * Works across different browsers (Chrome, Firefox, Safari).
 */
export function getNetworkHints(): NetworkHints {
	const c =
		(navigator as any).connection ||
		(navigator as any).mozConnection ||
		(navigator as any).webkitConnection;

	return {
		online: navigator.onLine,
		type: c?.type ?? 'unknown',
		effectiveType: c?.effectiveType ?? 'unknown',
		saveData: c?.saveData ?? false,
		downlink: c?.downlink ?? null,
		isLikelyConstrained:
			c?.saveData === true ||
			c?.effectiveType === 'slow-2g' ||
			c?.effectiveType === '2g' ||
			c?.effectiveType === '3g',
	};
}

/**
 * Check if user is on a constrained network (cellular or data saver mode).
 * Note: '4g' is NOT considered constrained as it's often reported even on WiFi.
 * Returns false if the Connection API is not supported.
 */
export function isOnCellular(): boolean {
	return getNetworkHints().isLikelyConstrained;
}
