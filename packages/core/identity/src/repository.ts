// NOTE: This file contains database operations for identity domain.
// It should only be called from use-cases, not directly from API routes.
import { db, userSettings, users } from "@babylon/db";
import { and, eq, isNull } from "drizzle-orm";
import type {
	CreateUserInput,
	UpdateProfileInput,
	UpdateSettingsInput,
	User,
	UserWithSettings,
} from "./types";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Remove undefined values from an object to prevent Drizzle/Postgres issues
 */
function cleanUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	const result: Partial<T> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			(result as Record<string, unknown>)[key] = value;
		}
	}
	return result;
}

// ============================================================================
// User Repository
// ============================================================================

/**
 * Find a user by their internal UUID
 */
export async function findUserById(id: string): Promise<User | null> {
	const result = await db.query.users.findFirst({
		where: and(eq(users.id, id), isNull(users.deletedAt)),
	});
	return result ?? null;
}

/**
 * Find a user by their Privy DID
 */
export async function findUserByPrivyId(
	privyUserId: string,
): Promise<User | null> {
	const result = await db.query.users.findFirst({
		where: and(eq(users.privyUserId, privyUserId), isNull(users.deletedAt)),
	});
	return result ?? null;
}

/**
 * Find a user by username
 */
export async function findUserByUsername(
	username: string,
): Promise<User | null> {
	const result = await db.query.users.findFirst({
		where: and(eq(users.username, username), isNull(users.deletedAt)),
	});
	return result ?? null;
}

/**
 * Find a user by wallet address
 */
export async function findUserByWallet(
	walletAddress: string,
): Promise<User | null> {
	const result = await db.query.users.findFirst({
		where: and(eq(users.walletAddress, walletAddress), isNull(users.deletedAt)),
	});
	return result ?? null;
}

/**
 * Find a user with their settings
 */
export async function findUserWithSettings(
	id: string,
): Promise<UserWithSettings | null> {
	const result = await db.query.users.findFirst({
		where: and(eq(users.id, id), isNull(users.deletedAt)),
		with: {
			settings: true,
		},
	});
	return result ?? null;
}

/**
 * Check if a username is already taken
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
	const existing = await db.query.users.findFirst({
		where: eq(users.username, username),
		columns: { id: true },
	});
	return existing !== undefined;
}

/**
 * Create a new user with default settings
 */
export async function createUser(input: CreateUserInput): Promise<User> {
	const [user] = await db
		.insert(users)
		.values({
			privyUserId: input.privyUserId,
			username: input.username,
			email: input.email,
			displayName: input.displayName,
			avatarUrl: input.avatarUrl,
			walletAddress: input.walletAddress,
		})
		.returning();

	if (!user) {
		throw new Error("Failed to create user");
	}

	// Create default settings
	await db.insert(userSettings).values({
		userId: user.id,
	});

	return user;
}

/**
 * Update user profile fields
 */
export async function updateUserProfile(
	id: string,
	input: UpdateProfileInput,
): Promise<User | null> {
	const updateData = cleanUndefined({
		...input,
		updatedAt: new Date(),
	});

	const [updated] = await db
		.update(users)
		.set(updateData)
		.where(and(eq(users.id, id), isNull(users.deletedAt)))
		.returning();

	return updated ?? null;
}

/**
 * Update user settings
 */
export async function updateUserSettings(
	userId: string,
	input: UpdateSettingsInput,
): Promise<void> {
	const updateData = cleanUndefined({
		...input,
		updatedAt: new Date(),
	});

	await db
		.update(userSettings)
		.set(updateData)
		.where(eq(userSettings.userId, userId));
}

/**
 * Update user's wallet address
 */
export async function updateUserWallet(
	id: string,
	walletAddress: string,
): Promise<User | null> {
	const [updated] = await db
		.update(users)
		.set({
			walletAddress,
			updatedAt: new Date(),
		})
		.where(and(eq(users.id, id), isNull(users.deletedAt)))
		.returning();

	return updated ?? null;
}

/**
 * Soft delete a user
 */
export async function softDeleteUser(id: string): Promise<boolean> {
	const result = await db
		.update(users)
		.set({
			deletedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(users.id, id), isNull(users.deletedAt)));

	return result.rowCount !== null && result.rowCount > 0;
}
