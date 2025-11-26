// NOTE: This service wraps the Privy SDK for token verification and user data.

import { createLogger, getConfig } from "@babylon/shared-infra";
import {
	type AuthTokenClaims,
	PrivyClient,
	type User,
} from "@privy-io/server-auth";

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

// ============================================================================
// User Data (via Identity Token - no rate limits)
// ============================================================================

/**
 * Get a Privy user from their identity token.
 * This method is NOT rate limited (unlike getUserById).
 */
export async function getPrivyUser(idToken: string): Promise<User> {
	const client = getPrivyClient();

	try {
		return await client.getUser({ idToken });
	} catch (error) {
		log.debug("Failed to get Privy user from identity token", error as Error);
		throw error;
	}
}

/**
 * Extract the smart wallet address from a Privy user's linked accounts
 */
export function extractSmartWalletAddress(user: User): string | null {
	const smartWallet = user.linkedAccounts.find(
		(account) => account.type === "smart_wallet",
	);

	if (smartWallet && smartWallet.type === "smart_wallet") {
		return smartWallet.address;
	}

	return null;
}

/**
 * Extract the embedded wallet address from a Privy user's linked accounts
 * (fallback if no smart wallet)
 */
export function extractEmbeddedWalletAddress(user: User): string | null {
	const embeddedWallet = user.linkedAccounts.find(
		(account) =>
			account.type === "wallet" && account.walletClientType === "privy",
	);

	if (embeddedWallet && embeddedWallet.type === "wallet") {
		return embeddedWallet.address;
	}

	return null;
}

// ============================================================================
// Linked Account Extraction
// ============================================================================

/**
 * Data extracted from Privy linked accounts for user creation
 */
export interface PrivyLinkedData {
	// Wallets
	walletAddress: string | null;
	// Email
	email: string | null;
	// Twitter
	twitterId: string | null;
	twitterUsername: string | null;
	// Farcaster
	farcasterFid: string | null;
	farcasterUsername: string | null;
	// Discord
	discordId: string | null;
	discordUsername: string | null;
	// Profile defaults (from socials)
	suggestedDisplayName: string | null;
	suggestedAvatarUrl: string | null;
}

/**
 * Extract all relevant linked account data from a Privy user.
 * This includes wallets, email, and social accounts.
 */
export function extractLinkedData(user: User): PrivyLinkedData {
	const data: PrivyLinkedData = {
		walletAddress: null,
		email: null,
		twitterId: null,
		twitterUsername: null,
		farcasterFid: null,
		farcasterUsername: null,
		discordId: null,
		discordUsername: null,
		suggestedDisplayName: null,
		suggestedAvatarUrl: null,
	};

	// Extract wallet (prefer smart wallet, fallback to embedded)
	data.walletAddress =
		extractSmartWalletAddress(user) ?? extractEmbeddedWalletAddress(user);

	for (const account of user.linkedAccounts) {
		switch (account.type) {
			case "email":
				data.email = account.address;
				break;

			case "twitter_oauth":
				data.twitterId = account.subject;
				data.twitterUsername = account.username ?? null;
				// Use Twitter profile as fallback for display name/avatar
				if (!data.suggestedDisplayName && account.name) {
					data.suggestedDisplayName = account.name;
				}
				if (!data.suggestedAvatarUrl && account.profilePictureUrl) {
					data.suggestedAvatarUrl = account.profilePictureUrl;
				}
				break;

			case "farcaster":
				data.farcasterFid = account.fid?.toString() ?? null;
				data.farcasterUsername = account.username ?? null;
				// Use Farcaster profile as primary for display name/avatar
				if (account.displayName) {
					data.suggestedDisplayName = account.displayName;
				}
				if (account.pfp) {
					data.suggestedAvatarUrl = account.pfp;
				}
				break;

			case "discord_oauth":
				data.discordId = account.subject;
				data.discordUsername = account.username ?? null;
				break;
		}
	}

	return data;
}
