// packages/shared/infra/src/database.ts
import { db } from "@babylon/db";
import { retry } from "@babylon/shared-utils";
import { createLogger } from "./logger";

const log = createLogger("Database");

// ============================================================================
// Types
// ============================================================================

export type { Database } from "@babylon/db";

// Re-export the db instance
export { db };

// ============================================================================
// Database Utilities
// ============================================================================

/**
 * Execute a database operation with automatic retry for transient errors
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	context?: string,
): Promise<T> {
	return retry(operation, {
		maxAttempts: 3,
		initialDelay: 100,
		maxDelay: 2000,
		isRetryable: isRetryableDbError,
		onRetry: (error, attempt) => {
			log.warn(`Database retry attempt ${attempt}`, { error, context });
		},
	});
}

/**
 * Check if a database error is retryable
 */
function isRetryableDbError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	const message = error.message.toLowerCase();

	// Connection errors
	if (
		message.includes("connection") ||
		message.includes("timeout") ||
		message.includes("econnrefused") ||
		message.includes("econnreset")
	) {
		return true;
	}

	// Neon-specific errors
	if (
		message.includes("can't reach database server") ||
		message.includes("connection pool timeout")
	) {
		return true;
	}

	return false;
}

// ============================================================================
// Transaction Helper
// ============================================================================

/**
 * Execute operations in a transaction
 *
 * NOTE: Neon HTTP does not support real SQL transactions.
 * This helper provides API compatibility only. Do not rely on atomicity.
 * When we need real transactions, we will use the pooled Neon client.
 */
export async function transaction<T>(
	operations: (tx: typeof db) => Promise<T>,
): Promise<T> {
	return operations(db);
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth(): Promise<{
	healthy: boolean;
	latencyMs: number;
	error?: string;
}> {
	const start = Date.now();

	try {
		// Simple query to check connectivity
		await db.execute("SELECT 1");

		return {
			healthy: true,
			latencyMs: Date.now() - start,
		};
	} catch (error) {
		return {
			healthy: false,
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
