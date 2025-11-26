import type { userSettings, users } from "@babylon/db";

// ============================================================================
// User Types
// ============================================================================

/** User record from database */
export type User = typeof users.$inferSelect;

/** User settings record from database */
export type UserSettings = typeof userSettings.$inferSelect;

/** User with settings included */
export type UserWithSettings = User & {
	settings: UserSettings | null;
};

// ============================================================================
// Input Types
// ============================================================================

export interface CreateUserInput {
	privyUserId: string;
	username: string;
	email?: string;
	displayName?: string;
	avatarUrl?: string;
	walletAddress?: string;
	// Social accounts (auto-populated from Privy linked accounts)
	twitterId?: string;
	twitterUsername?: string;
	farcasterFid?: string;
	farcasterUsername?: string;
	discordId?: string;
	discordUsername?: string;
}

export interface UpdateProfileInput {
	displayName?: string;
	avatarUrl?: string;
	bio?: string;
	farcasterFid?: string;
	farcasterUsername?: string;
	twitterId?: string;
	twitterUsername?: string;
	discordId?: string;
	discordUsername?: string;
}

export interface UpdateSettingsInput {
	emailNotificationsEnabled?: boolean;
	pushNotificationsEnabled?: boolean;
	inAppNotificationsEnabled?: boolean;
	privacyProfileVisibility?: "public" | "followers" | "private";
	privacyShowSocials?: boolean;
	locale?: string;
	theme?: string;
}

// ============================================================================
// Query Types
// ============================================================================

export interface GetUsersOptions {
	limit?: number;
	offset?: number;
	includeSettings?: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthenticatedUser {
	id: string;
	privyUserId: string;
	username: string;
	role: "user" | "admin" | "system";
	isBanned: boolean;
}
