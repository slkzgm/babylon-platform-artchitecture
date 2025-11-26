import "dotenv/config";
import { loadConfig, logger } from "@babylon/shared-infra";
import { createApp } from "./app";

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
