// NOTE: Authentication middlewares for Elysia routes using derive pattern.

import {
	type AuthenticatedUser,
	findUserByPrivyId,
} from "@babylon/core-identity";
import { Elysia } from "elysia";
import { extractBearerToken, verifyPrivyToken } from "../services/privy";

// ============================================================================
// Privy Auth Plugin
// ============================================================================

/**
 * Plugin that verifies Privy access token and adds privyUserId to context.
 * Use this for routes where user may not exist in DB yet (onboarding).
 *
 * @example
 * ```ts
 * new Elysia()
 *   .use(privyAuth)
 *   .post("/users", ({ privyUserId }) => createUser(privyUserId))
 * ```
 */
export const privyAuth = new Elysia({ name: "privy-auth" }).derive(
	{ as: "scoped" },
	async ({ headers, status }) => {
		const authHeader = headers.authorization;
		const token = extractBearerToken(authHeader ?? null);

		if (!token) {
			return status(401, {
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Missing or invalid Authorization header",
				},
			});
		}

		try {
			const claims = await verifyPrivyToken(token);
			return { privyUserId: claims.userId };
		} catch {
			return status(401, {
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Invalid or expired access token",
				},
			});
		}
	},
);

// ============================================================================
// Require User Plugin
// ============================================================================

/**
 * Plugin that requires a fully onboarded user (exists in DB, not banned).
 * Includes privyAuth verification + DB lookup.
 *
 * @example
 * ```ts
 * new Elysia()
 *   .use(requireUser)
 *   .get("/me", ({ user }) => user)
 * ```
 */
export const requireUser = new Elysia({ name: "require-user" }).derive(
	{ as: "scoped" },
	async ({ headers, status }) => {
		const authHeader = headers.authorization;
		const token = extractBearerToken(authHeader ?? null);

		if (!token) {
			return status(401, {
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Missing or invalid Authorization header",
				},
			});
		}

		let privyUserId: string;
		try {
			const claims = await verifyPrivyToken(token);
			privyUserId = claims.userId;
		} catch {
			return status(401, {
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Invalid or expired access token",
				},
			});
		}

		const dbUser = await findUserByPrivyId(privyUserId);

		if (!dbUser) {
			return status(401, {
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "User not found. Please complete onboarding.",
				},
			});
		}

		if (dbUser.isBanned) {
			return status(403, {
				success: false,
				error: {
					code: "FORBIDDEN",
					message: "Your account has been suspended",
				},
			});
		}

		const user: AuthenticatedUser = {
			id: dbUser.id,
			privyUserId: dbUser.privyUserId,
			username: dbUser.username,
			role: dbUser.role,
			isBanned: dbUser.isBanned,
		};

		return { user, privyUserId };
	},
);

// ============================================================================
// Optional Auth Plugin
// ============================================================================

/**
 * Plugin for optional authentication - sets user to null if not authenticated.
 * Use for routes that behave differently for authenticated users.
 *
 * @example
 * ```ts
 * new Elysia()
 *   .use(optionalAuth)
 *   .get("/posts", ({ user }) => getPosts(user?.id))
 * ```
 */
export const optionalAuth = new Elysia({ name: "optional-auth" }).derive(
	{ as: "scoped" },
	async ({ headers }): Promise<{ user: AuthenticatedUser | null }> => {
		const authHeader = headers.authorization;
		const token = extractBearerToken(authHeader ?? null);

		if (!token) {
			return { user: null };
		}

		try {
			const claims = await verifyPrivyToken(token);
			const dbUser = await findUserByPrivyId(claims.userId);

			if (!dbUser || dbUser.isBanned) {
				return { user: null };
			}

			return {
				user: {
					id: dbUser.id,
					privyUserId: dbUser.privyUserId,
					username: dbUser.username,
					role: dbUser.role,
					isBanned: dbUser.isBanned,
				},
			};
		} catch {
			return { user: null };
		}
	},
);

// ============================================================================
// Admin Guard Helper
// ============================================================================

/**
 * Check if user has admin privileges.
 * Use in route handlers after requireUser.
 *
 * @example
 * ```ts
 * new Elysia()
 *   .use(requireUser)
 *   .get("/admin", ({ user, status }) => {
 *     if (!isAdmin(user)) return status(403, { message: "Admin required" });
 *     return adminData();
 *   })
 * ```
 */
export function isAdmin(user: AuthenticatedUser): boolean {
	return user.role === "admin" || user.role === "system";
}
