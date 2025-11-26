import {
	createUser,
	getUserById,
	getUserByUsername,
	getUserWithSettings,
	isUsernameAvailable,
	linkWallet,
	updateProfile,
	updateSettings,
} from "@babylon/core-identity";
import { Elysia, t } from "elysia";
import { privyAuth, requireUser } from "../middleware/auth";

// ============================================================================
// Validation Schemas
// ============================================================================

const createUserSchema = t.Object({
	username: t.String({ minLength: 3, maxLength: 50 }),
	displayName: t.Optional(t.String({ maxLength: 100 })),
	avatarUrl: t.Optional(t.String()),
	walletAddress: t.Optional(t.String({ pattern: "^0x[a-fA-F0-9]{40}$" })),
});

const updateProfileSchema = t.Object({
	displayName: t.Optional(t.String({ maxLength: 100 })),
	avatarUrl: t.Optional(t.String()),
	bio: t.Optional(t.String({ maxLength: 500 })),
	farcasterFid: t.Optional(t.String()),
	farcasterUsername: t.Optional(t.String()),
	twitterId: t.Optional(t.String()),
	twitterUsername: t.Optional(t.String()),
	discordId: t.Optional(t.String()),
	discordUsername: t.Optional(t.String()),
});

const updateSettingsSchema = t.Object({
	emailNotificationsEnabled: t.Optional(t.Boolean()),
	pushNotificationsEnabled: t.Optional(t.Boolean()),
	inAppNotificationsEnabled: t.Optional(t.Boolean()),
	privacyProfileVisibility: t.Optional(
		t.Union([
			t.Literal("public"),
			t.Literal("followers"),
			t.Literal("private"),
		]),
	),
	privacyShowSocials: t.Optional(t.Boolean()),
	locale: t.Optional(t.String({ maxLength: 10 })),
	theme: t.Optional(t.String({ maxLength: 20 })),
});

const linkWalletSchema = t.Object({
	walletAddress: t.String({ pattern: "^0x[a-fA-F0-9]{40}$" }),
});

// ============================================================================
// Public Routes
// ============================================================================

const publicRoutes = new Elysia({ name: "identity-public" })
	/**
	 * Check if a username is available
	 * GET /api/identity/username/:username/available
	 */
	.get(
		"/username/:username/available",
		async ({ params }) => {
			const available = await isUsernameAvailable(params.username);
			return { available };
		},
		{
			params: t.Object({
				username: t.String({ minLength: 3, maxLength: 50 }),
			}),
		},
	)

	/**
	 * Get a user's public profile by username
	 * GET /api/identity/users/by-username/:username
	 */
	.get(
		"/users/by-username/:username",
		async ({ params }) => {
			const user = await getUserByUsername(params.username);
			return {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				bio: user.bio,
				postsCount: user.postsCount,
				followersCount: user.followersCount,
				followingCount: user.followingCount,
				createdAt: user.createdAt,
			};
		},
		{
			params: t.Object({
				username: t.String(),
			}),
		},
	)

	/**
	 * Get a user's public profile by ID
	 * GET /api/identity/users/:id
	 */
	.get(
		"/users/:id",
		async ({ params }) => {
			const user = await getUserById(params.id);
			return {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				bio: user.bio,
				postsCount: user.postsCount,
				followersCount: user.followersCount,
				followingCount: user.followingCount,
				createdAt: user.createdAt,
			};
		},
		{
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);

// ============================================================================
// Onboarding Routes (Privy auth only, user may not exist in DB)
// ============================================================================

const onboardingRoutes = new Elysia({ name: "identity-onboarding" })
	.use(privyAuth)

	/**
	 * Create a new user (onboarding)
	 * POST /api/identity/users
	 *
	 * Requires valid Privy token but user may not exist yet in our DB
	 */
	.post(
		"/users",
		async ({ privyUserId, body }) => {
			const user = await createUser({
				privyUserId,
				username: body.username,
				displayName: body.displayName,
				avatarUrl: body.avatarUrl,
				walletAddress: body.walletAddress,
			});

			return {
				id: user.id,
				username: user.username,
				displayName: user.displayName,
				avatarUrl: user.avatarUrl,
				createdAt: user.createdAt,
			};
		},
		{
			body: createUserSchema,
		},
	);

// ============================================================================
// Authenticated Routes (User must exist in DB)
// ============================================================================

const authenticatedRoutes = new Elysia({ name: "identity-auth" })
	.use(requireUser)

	/**
	 * Get current user's profile (with settings)
	 * GET /api/identity/me
	 */
	.get("/me", async ({ user }) => {
		const fullUser = await getUserWithSettings(user.id);
		return {
			id: fullUser.id,
			username: fullUser.username,
			displayName: fullUser.displayName,
			avatarUrl: fullUser.avatarUrl,
			bio: fullUser.bio,
			email: fullUser.email,
			walletAddress: fullUser.walletAddress,
			farcasterFid: fullUser.farcasterFid,
			farcasterUsername: fullUser.farcasterUsername,
			twitterId: fullUser.twitterId,
			twitterUsername: fullUser.twitterUsername,
			discordId: fullUser.discordId,
			discordUsername: fullUser.discordUsername,
			postsCount: fullUser.postsCount,
			followersCount: fullUser.followersCount,
			followingCount: fullUser.followingCount,
			role: fullUser.role,
			createdAt: fullUser.createdAt,
			settings: fullUser.settings,
		};
	})

	/**
	 * Update current user's profile
	 * PATCH /api/identity/me
	 */
	.patch(
		"/me",
		async ({ user, body }) => {
			const updated = await updateProfile(user.id, body);
			return {
				id: updated.id,
				username: updated.username,
				displayName: updated.displayName,
				avatarUrl: updated.avatarUrl,
				bio: updated.bio,
			};
		},
		{
			body: updateProfileSchema,
		},
	)

	/**
	 * Update current user's settings
	 * PATCH /api/identity/me/settings
	 */
	.patch(
		"/me/settings",
		async ({ user, body }) => {
			await updateSettings(user.id, body);
			return { success: true };
		},
		{
			body: updateSettingsSchema,
		},
	)

	/**
	 * Link a wallet to current user
	 * POST /api/identity/me/wallet
	 */
	.post(
		"/me/wallet",
		async ({ user, body }) => {
			const updated = await linkWallet(user.id, body.walletAddress);
			return {
				id: updated.id,
				walletAddress: updated.walletAddress,
			};
		},
		{
			body: linkWalletSchema,
		},
	);

// ============================================================================
// Combined Routes
// ============================================================================

export const identityRoutes = new Elysia({
	name: "identity",
	prefix: "/identity",
})
	.use(publicRoutes)
	.use(onboardingRoutes)
	.use(authenticatedRoutes);
