import path from "node:path";
import { config as loadDotenv } from "dotenv";
import type { NextConfig } from "next";

const monorepoRoot = path.resolve(process.cwd(), "..", "..");

// Load shared env from the monorepo root so NEXT_PUBLIC_* variables work when
// running the web app directly from apps/web.
loadDotenv({ path: path.join(monorepoRoot, ".env") });
loadDotenv({ path: path.join(monorepoRoot, ".env.local"), override: true });

const nextConfig: NextConfig = {
	reactCompiler: true,
};

export default nextConfig;
