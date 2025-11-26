"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiRequestError, identity, type UserWithSettings } from "@/lib/api";

export type AuthState =
	| { status: "loading" }
	| { status: "unauthenticated" }
	| { status: "needs-onboarding"; privyUserId: string }
	| { status: "authenticated"; user: UserWithSettings }
	| { status: "banned"; message: string };

/**
 * Hook to manage authentication state
 *
 * Combines Privy auth state with our backend user state to determine:
 * - loading: Still checking auth
 * - unauthenticated: Not logged in with Privy
 * - needs-onboarding: Logged in with Privy but no user in our DB
 * - authenticated: Fully authenticated with user in our DB
 */
export function useAuth(): AuthState & { logout: () => Promise<void> } {
	const {
		ready,
		authenticated,
		user: privyUser,
		logout: privyLogout,
	} = usePrivy();
	const queryClient = useQueryClient();

	// Fetch our backend user when authenticated with Privy
	const {
		data: user,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["me"],
		queryFn: () => identity.getMe(),
		enabled: ready && authenticated,
		retry: false,
	});

	const logout = async () => {
		await privyLogout();
		queryClient.clear();
	};

	// Still initializing Privy
	if (!ready) {
		return { status: "loading", logout };
	}

	// Not logged in with Privy
	if (!authenticated) {
		return { status: "unauthenticated", logout };
	}

	// Logged in with Privy, checking our backend
	if (isLoading) {
		return { status: "loading", logout };
	}

	// Error fetching user
	if (error) {
		if (error instanceof ApiRequestError) {
			// 401: User not in our DB yet, needs onboarding
			if (error.status === 401) {
				return {
					status: "needs-onboarding",
					privyUserId: privyUser?.id ?? "",
					logout,
				};
			}

			// 403: User is banned
			if (error.status === 403) {
				return {
					status: "banned",
					message: error.message,
					logout,
				};
			}
		}

		// Other errors - treat as unauthenticated
		return { status: "unauthenticated", logout };
	}

	// Fully authenticated
	if (user) {
		return { status: "authenticated", user, logout };
	}

	// Fallback
	return { status: "loading", logout };
}

/**
 * Invalidate user data after updates
 */
export function useInvalidateUser() {
	const queryClient = useQueryClient();
	return () => queryClient.invalidateQueries({ queryKey: ["me"] });
}
