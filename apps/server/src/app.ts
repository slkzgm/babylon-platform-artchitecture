import { api } from "@babylon/api";
import {
	BabylonError,
	checkDatabaseHealth,
	getConfig,
	isBabylonError,
	logger,
	toErrorResponse,
} from "@babylon/shared-infra";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

/**
 * Create and configure the Elysia application
 */
export function createApp() {
	const config = getConfig();

	const app = new Elysia({ name: "babylon-server" })
		// CORS
		.use(
			cors({
				origin: config.CORS_ORIGIN || false,
				methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
				credentials: true,
			}),
		)

		// Register custom error types for type narrowing
		.error({
			BABYLON_ERROR: BabylonError,
		})

		// Global error handler
		.onError(({ error, code, set }) => {
			// Handle our custom errors
			if (isBabylonError(error)) {
				set.status = error.statusCode;
				logger.warn("Request error", {
					code: error.code,
					message: error.message,
					context: error.context,
				});
				return toErrorResponse(error);
			}

			// Handle Elysia built-in errors
			if (code === "NOT_FOUND") {
				set.status = 404;
				return {
					success: false,
					error: { code: "NOT_FOUND", message: "Route not found" },
				};
			}

			if (code === "VALIDATION") {
				set.status = 400;
				return {
					success: false,
					error: {
						code: "VALIDATION_ERROR",
						message: error.message,
					},
				};
			}

			// Unknown errors
			logger.error("Unhandled error", error);
			set.status = 500;
			return toErrorResponse(error);
		})

		// Request logging (after routes are registered)
		.onAfterResponse(({ request, set }) => {
			const method = request.method;
			const url = new URL(request.url).pathname;
			const status = set.status ?? 200;

			// Skip logging for health checks
			if (url === "/health" || url === "/health/live") return;

			logger.debug(`${method} ${url} ${status}`);
		})

		// Health check endpoints
		.get("/health", async () => {
			const dbHealth = await checkDatabaseHealth();

			return {
				status: dbHealth.healthy ? "healthy" : "degraded",
				timestamp: new Date().toISOString(),
				services: {
					database: {
						status: dbHealth.healthy ? "up" : "down",
						latencyMs: dbHealth.latencyMs,
						error: dbHealth.error,
					},
				},
			};
		})

		.get("/health/live", () => ({ status: "ok" }))

		// Mount API routes
		.use(api);

	return app;
}

export type App = ReturnType<typeof createApp>;
