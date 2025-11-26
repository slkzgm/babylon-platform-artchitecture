import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load env from monorepo root BEFORE importing anything that touches process.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, "..", "..", "..");
dotenv.config({ path: path.join(monorepoRoot, ".env") });
dotenv.config({ path: path.join(monorepoRoot, ".env.local"), override: true });

const { loadConfig, logger } = await import("@babylon/shared-infra");
const { createApp } = await import("./app");

// Load and validate config at startup
const config = loadConfig();

const app = createApp();

app.listen(config.PORT, () => {
	logger.info("Server started", {
		port: config.PORT,
		env: config.NODE_ENV,
		cors: config.CORS_ORIGIN ?? "disabled",
	});
});

// Graceful shutdown
process.on("SIGINT", () => {
	logger.info("Shutting down server...");
	process.exit(0);
});

process.on("SIGTERM", () => {
	logger.info("Shutting down server...");
	process.exit(0);
});
