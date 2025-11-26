import { Elysia } from "elysia";
import { identityRoutes } from "./routes/identity";

/**
 * Main API plugin - mounts all route modules
 */
export const api = new Elysia({ name: "api", prefix: "/api" })
	.use(identityRoutes)
	// Future route modules will be added here:
	// .use(socialRoutes)
	// .use(economyRoutes)
	// etc.
	.get("/", () => ({
		name: "Babylon API",
		version: "2.0.0",
	}));

// Export types for Eden client
export type Api = typeof api;
