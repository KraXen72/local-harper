export interface NetworkHints {
	online: boolean;
	type: string;
	effectiveType: string;
	saveData: boolean;
	downlink: number | null;
	isLikelyConstrained: boolean;
}

type NetworkConnection = {
	type?: string;
	effectiveType?: string;
	saveData?: boolean;
	downlink?: number;
};

type NavigatorWithConnection = Navigator & {
	connection?: NetworkConnection;
	mozConnection?: NetworkConnection;
	webkitConnection?: NetworkConnection;
};

/**
 * Get network connection hints from the Network Information API.
 * Works across different browsers (Chrome, Firefox, Safari).
 */
export function getNetworkHints(): NetworkHints {
	const nav = navigator as NavigatorWithConnection;
	const c =
		nav.connection ||
		nav.mozConnection ||
		nav.webkitConnection;

	return {
		online: nav.onLine,
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
