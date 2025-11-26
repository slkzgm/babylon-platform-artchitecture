import { NotFoundError, ValidationError } from "@babylon/shared-infra";
import { CONTENT_LIMITS } from "@babylon/shared-utils";
import * as repo from "../repository";
import type { UpdateProfileInput, UpdateSettingsInput, User } from "../types";

// ============================================================================
// Validation
// ============================================================================

function validateProfileInput(input: UpdateProfileInput): void {
	if (input.displayName !== undefined) {
		if (input.displayName.length > CONTENT_LIMITS.DISPLAY_NAME) {
			throw new ValidationError(
				`Display name must be ${CONTENT_LIMITS.DISPLAY_NAME} characters or less`,
			);
		}
	}

	if (input.bio !== undefined) {
		if (input.bio.length > CONTENT_LIMITS.BIO) {
			throw new ValidationError(
				`Bio must be ${CONTENT_LIMITS.BIO} characters or less`,
			);
		}
	}
}

// ============================================================================
// Use Cases
// ============================================================================

/**
 * Update a user's profile
 */
export async function updateProfile(
	userId: string,
	input: UpdateProfileInput,
): Promise<User> {
	// Validate input
	validateProfileInput(input);

	// Update the profile
	const updated = await repo.updateUserProfile(userId, input);
	if (!updated) {
		throw new NotFoundError("User", userId);
	}

	return updated;
}

/**
 * Update a user's settings
 */
export async function updateSettings(
	userId: string,
	input: UpdateSettingsInput,
): Promise<void> {
	// Check user exists
	const user = await repo.findUserById(userId);
	if (!user) {
		throw new NotFoundError("User", userId);
	}

	await repo.updateUserSettings(userId, input);
}

/**
 * Link a wallet to a user's profile
 */
export async function linkWallet(
	userId: string,
	walletAddress: string,
): Promise<User> {
	// Check if wallet is already linked to another user
	const existingUser = await repo.findUserByWallet(walletAddress);
	if (existingUser && existingUser.id !== userId) {
		throw new ValidationError("Wallet is already linked to another account", {
			walletAddress,
		});
	}

	const updated = await repo.updateUserWallet(userId, walletAddress);
	if (!updated) {
		throw new NotFoundError("User", userId);
	}

	return updated;
}
