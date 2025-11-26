// packages/shared/utils/src/format.ts

// ============================================================================
// Number Formatting
// ============================================================================

const SUFFIXES = ["", "K", "M", "B", "T"];

/**
 * Format a number with K/M/B/T suffix
 * @example formatNumber(1500) => "1.5K"
 */
export function formatNumber(num: number, decimals = 1): string {
	if (num === 0) return "0";
	if (!Number.isFinite(num)) return String(num);

	const sign = num < 0 ? "-" : "";
	const absNum = Math.abs(num);

	if (absNum < 1000) {
		return sign + absNum.toFixed(decimals).replace(/\.0+$/, "");
	}

	const tier = Math.min(
		Math.floor(Math.log10(absNum) / 3),
		SUFFIXES.length - 1,
	);
	const scaled = absNum / 1000 ** tier;
	const formatted = scaled.toFixed(decimals).replace(/\.0+$/, "");

	return sign + formatted + SUFFIXES[tier];
}

/**
 * Format currency with $ prefix
 * @example formatCurrency(1234.567) => "$1,234.57"
 */
export function formatCurrency(amount: number, decimals = 2): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(amount);
}

/**
 * Format as percentage
 * @example formatPercentage(0.1567) => "15.67%"
 */
export function formatPercentage(value: number, decimals = 2): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

// ============================================================================
// Time Formatting
// ============================================================================

const TIME_UNITS: [number, string][] = [
	[60, "s"],
	[60, "m"],
	[24, "h"],
	[7, "d"],
	[4.345, "w"],
	[12, "mo"],
	[Number.POSITIVE_INFINITY, "y"],
];

/**
 * Format a date as relative time (e.g., "5m", "2h", "3d")
 */
export function formatRelativeTime(date: Date | string | number): string {
	const now = Date.now();
	const then = new Date(date).getTime();
	let diff = Math.abs(now - then) / 1000; // seconds

	if (diff < 60) return "now";

	for (const [divisor, unit] of TIME_UNITS) {
		if (diff < divisor) {
			return `${Math.floor(diff)}${unit}`;
		}
		diff /= divisor;
	}

	return new Date(date).toLocaleDateString();
}

/**
 * Format a date in ISO format without milliseconds
 * @example "2024-01-15T10:30:00Z"
 */
export function formatISODate(date: Date | string | number): string {
	return new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");
}

// ============================================================================
// String Formatting
// ============================================================================

/**
 * Sanitize a string for use as an ID (lowercase, alphanumeric, hyphens)
 * @example sanitizeId("Hello World!") => "hello-world"
 */
export function sanitizeId(input: string): string {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Truncate a string with ellipsis
 * @example truncate("Hello World", 8) => "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize first letter
 * @example capitalize("hello") => "Hello"
 */
export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}
