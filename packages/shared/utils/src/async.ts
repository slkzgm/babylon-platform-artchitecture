// packages/shared/utils/src/async.ts

import type { Result } from "./types";
import { Err, Ok } from "./types";

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryOptions {
	/** Maximum number of attempts (default: 3) */
	maxAttempts?: number;
	/** Initial delay in ms (default: 100) */
	initialDelay?: number;
	/** Maximum delay in ms (default: 5000) */
	maxDelay?: number;
	/** Backoff multiplier (default: 2) */
	multiplier?: number;
	/** Custom function to determine if error is retryable */
	isRetryable?: (error: unknown) => boolean;
	/** Callback on each retry attempt */
	onRetry?: (error: unknown, attempt: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<
	Omit<RetryOptions, "isRetryable" | "onRetry">
> = {
	maxAttempts: 3,
	initialDelay: 100,
	maxDelay: 5000,
	multiplier: 2,
};

// ============================================================================
// Retry Functions
// ============================================================================

/**
 * Default check for retryable errors (network errors, 5xx, 429)
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		// Network errors
		if (
			message.includes("network") ||
			message.includes("timeout") ||
			message.includes("econnrefused") ||
			message.includes("econnreset")
		) {
			return true;
		}
	}

	// HTTP-like errors with status codes
	if (
		typeof error === "object" &&
		error !== null &&
		"status" in error &&
		typeof (error as { status: unknown }).status === "number"
	) {
		const status = (error as { status: number }).status;
		return status >= 500 || status === 429;
	}

	return false;
}

/**
 * Execute an async operation with retry logic
 */
export async function retry<T>(
	operation: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
	const isRetryable = opts.isRetryable ?? isRetryableError;

	let lastError: unknown;
	let delay = opts.initialDelay;

	for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;

			if (attempt === opts.maxAttempts || !isRetryable(error)) {
				throw error;
			}

			opts.onRetry?.(error, attempt);

			await sleep(delay);
			delay = Math.min(delay * opts.multiplier, opts.maxDelay);
		}
	}

	throw lastError;
}

/**
 * Execute an async operation and return a Result instead of throwing
 */
export async function tryCatch<T, E = Error>(
	operation: () => Promise<T>,
): Promise<Result<T, E>> {
	try {
		const value = await operation();
		return Ok(value);
	} catch (error) {
		return Err(error as E);
	}
}

// ============================================================================
// Timing Utilities
// ============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with a timeout
 * @throws Error if operation times out
 */
export async function withTimeout<T>(
	operation: () => Promise<T>,
	timeoutMs: number,
	message = "Operation timed out",
): Promise<T> {
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error(message)), timeoutMs);
	});

	return Promise.race([operation(), timeoutPromise]);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delayMs: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => fn(...args), delayMs);
	};
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limitMs: number,
): (...args: Parameters<T>) => void {
	let lastRun = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();
		if (now - lastRun >= limitMs) {
			lastRun = now;
			fn(...args);
		}
	};
}
