// packages/shared/infra/src/config.ts
import { z } from "zod";

// ============================================================================
// Environment Schema
// ============================================================================

// URL validation regex (replaces deprecated z.string().url())
const urlRegex = /^https?:\/\/.+/;

const envSchema = z.object({
	// Node environment
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),

	// Database
	DATABASE_URL: z
		.string()
		.regex(/^postgres(ql)?:\/\/.+/, "Invalid DATABASE_URL"),

	// Server
	PORT: z.coerce.number().default(3000),
	CORS_ORIGIN: z.string().optional(),

	// Logging
	LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

	// Redis (optional)
	REDIS_URL: z.string().regex(urlRegex, "Invalid REDIS_URL").optional(),
	UPSTASH_REDIS_REST_URL: z
		.string()
		.regex(urlRegex, "Invalid UPSTASH_REDIS_REST_URL")
		.optional(),
	UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

	// Auth (Privy)
	PRIVY_APP_ID: z.string().optional(),
	PRIVY_APP_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// ============================================================================
// Config Singleton
// ============================================================================

let _config: Env | null = null;

/**
 * Load and validate environment variables.
 * Call this once at application startup.
 * @throws ZodError if validation fails
 */
export function loadConfig(): Env {
	if (_config) return _config;

	const result = envSchema.safeParse(process.env);

	if (!result.success) {
		const formatted = result.error.issues
			.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
			.join("\n");
		throw new Error(`Invalid environment configuration:\n${formatted}`);
	}

	_config = result.data;
	return _config;
}

/**
 * Get the loaded config. Throws if config hasn't been loaded yet.
 */
export function getConfig(): Env {
	if (!_config) {
		throw new Error(
			"Config not loaded. Call loadConfig() at application startup.",
		);
	}
	return _config;
}

/**
 * Check if we're in production
 */
export function isProduction(): boolean {
	return getConfig().NODE_ENV === "production";
}

/**
 * Check if we're in development
 */
export function isDevelopment(): boolean {
	return getConfig().NODE_ENV === "development";
}

/**
 * Check if we're in test
 */
export function isTest(): boolean {
	return getConfig().NODE_ENV === "test";
}

// ============================================================================
// Environment-specific helpers
// ============================================================================

/**
 * Get Redis configuration (prefers Upstash in production)
 */
export function getRedisConfig():
	| { type: "upstash"; url: string; token: string }
	| { type: "ioredis"; url: string }
	| null {
	const config = getConfig();

	if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
		return {
			type: "upstash",
			url: config.UPSTASH_REDIS_REST_URL,
			token: config.UPSTASH_REDIS_REST_TOKEN,
		};
	}

	if (config.REDIS_URL) {
		return {
			type: "ioredis",
			url: config.REDIS_URL,
		};
	}

	return null;
}
