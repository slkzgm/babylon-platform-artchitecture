// NOTE: This service wraps the Privy SDK for token verification.

import { createLogger, getConfig } from "@babylon/shared-infra";
import { type AuthTokenClaims, PrivyClient } from "@privy-io/server-auth";

const log = createLogger("privy");

// ============================================================================
// Privy Client Singleton
// ============================================================================

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
	if (privyClient) return privyClient;

	const config = getConfig();

	if (!config.PRIVY_APP_ID || !config.PRIVY_APP_SECRET) {
		throw new Error(
			"Privy credentials not configured (PRIVY_APP_ID, PRIVY_APP_SECRET)",
		);
	}

	privyClient = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET);
	return privyClient;
}

// ============================================================================
// Token Verification
// ============================================================================

/**
 * Verify a Privy access token and return the claims.
 * @throws UnauthorizedError if token is invalid or expired
 */
export async function verifyPrivyToken(
	token: string,
): Promise<AuthTokenClaims> {
	const client = getPrivyClient();

	try {
		return await client.verifyAuthToken(token);
	} catch (error) {
		log.debug("Privy token verification failed", error as Error);
		throw error;
	}
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
	if (!authHeader) return null;

	const lower = authHeader.toLowerCase();
	if (!lower.startsWith("bearer ")) return null;

	return authHeader.slice(7).trim() || null;
}
