import { NotFoundError } from "@babylon/shared-infra";
import * as repo from "../repository";
import type { User, UserWithSettings } from "../types";

/**
 * Get a user by their internal ID
 */
export async function getUserById(id: string): Promise<User> {
	const user = await repo.findUserById(id);
	if (!user || user.isBanned) {
		throw new NotFoundError("User", id);
	}
	return user;
}

/**
 * Get a user by their Privy DID
 */
export async function getUserByPrivyId(privyUserId: string): Promise<User> {
	const user = await repo.findUserByPrivyId(privyUserId);
	if (!user) {
		throw new NotFoundError("User", privyUserId);
	}
	return user;
}

/**
 * Get a user by username
 */
export async function getUserByUsername(username: string): Promise<User> {
	const user = await repo.findUserByUsername(username.toLowerCase());
	if (!user || user.isBanned) {
		throw new NotFoundError("User", username);
	}
	return user;
}

/**
 * Get a user with their settings
 */
export async function getUserWithSettings(
	id: string,
): Promise<UserWithSettings> {
	const user = await repo.findUserWithSettings(id);
	if (!user) {
		throw new NotFoundError("User", id);
	}
	return user;
}

/**
 * Try to get a user by Privy ID, returns null if not found (for auth flow)
 */
export async function findUserByPrivyId(
	privyUserId: string,
): Promise<User | null> {
	return repo.findUserByPrivyId(privyUserId);
}

/**
 * Check if a username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
	const taken = await repo.isUsernameTaken(username.toLowerCase());
	return !taken;
}
