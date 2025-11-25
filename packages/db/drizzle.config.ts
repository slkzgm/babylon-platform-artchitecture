import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load env from root .env so we keep a single source of truth.
dotenv.config({
	path: "../../.env",
});

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
