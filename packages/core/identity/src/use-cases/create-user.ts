import { ConflictError, ValidationError } from "@babylon/shared-infra";
import * as repo from "../repository";
import type { CreateUserInput, User } from "../types";

// ============================================================================
// Validation
// ============================================================================

const USERNAME_REGEX = /^[a-z0-9_]{3,50}$/;

/**
 * Check if an error is a Postgres unique constraint violation (code 23505)
 */
function isUniqueViolation(
	error: unknown,
): error is { code: string; detail?: string } {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: unknown }).code === "23505"
	);
}

function validateUsername(username: string): void {
	if (!USERNAME_REGEX.test(username)) {
		throw new ValidationError(
			"Username must be 3-50 characters, lowercase alphanumeric and underscores only",
			{ username },
		);
	}
}

// ============================================================================
// Use Case
// ============================================================================

export interface CreateUserParams {
	privyUserId: string;
	username: string;
	email?: string;
	displayName?: string;
	avatarUrl?: string;
	walletAddress?: string;
}

/**
 * Create a new user (onboarding flow)
 *
 * - Validates username format
 * - Checks for existing user with same Privy ID
 * - Checks for username uniqueness
 * - Creates user with default settings
 */
export async function createUser(params: CreateUserParams): Promise<User> {
	// Normalize username to lowercase
	const username = params.username.toLowerCase();

	// Validate username format
	validateUsername(username);

	// Check if user already exists with this Privy ID
	const existingByPrivy = await repo.findUserByPrivyId(params.privyUserId);
	if (existingByPrivy) {
		throw new ConflictError("User already exists for this account", {
			privyUserId: params.privyUserId,
		});
	}

	// Check if username is taken
	const usernameTaken = await repo.isUsernameTaken(username);
	if (usernameTaken) {
		throw new ConflictError("Username is already taken", { username });
	}

	// Check wallet uniqueness if provided
	if (params.walletAddress) {
		const existingByWallet = await repo.findUserByWallet(params.walletAddress);
		if (existingByWallet) {
			throw new ConflictError(
				"Wallet address is already linked to another user",
				{
					walletAddress: params.walletAddress,
				},
			);
		}
	}

	// Create the user
	const input: CreateUserInput = {
		privyUserId: params.privyUserId,
		username,
		email: params.email,
		displayName: params.displayName ?? username,
		avatarUrl: params.avatarUrl,
		walletAddress: params.walletAddress,
	};

	try {
		return await repo.createUser(input);
	} catch (error) {
		// Handle race condition: if unique constraint fails despite pre-checks
		if (isUniqueViolation(error)) {
			throw new ConflictError(
				"Account identifiers are already in use. Please choose another username or wallet.",
				{
					privyUserId: params.privyUserId,
					username,
					walletAddress: params.walletAddress,
				},
			);
		}
		throw error;
	}
}
