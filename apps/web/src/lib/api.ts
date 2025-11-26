// apps/web/src/lib/api.ts
// NOTE: API client for communicating with the backend.
import { getAccessToken } from "@privy-io/react-auth";

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

export interface ApiSuccess<T> {
	success: true;
	data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================================
// API Client
// ============================================================================

interface RequestOptions {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	body?: unknown;
	auth?: boolean;
}

/**
 * Make an authenticated API request
 */
export async function api<T>(
	endpoint: string,
	options: RequestOptions = {},
): Promise<T> {
	const { method = "GET", body, auth = true } = options;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	// Add auth header if needed
	if (auth) {
		const token = await getAccessToken();
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
	}

	const response = await fetch(`${API_URL}${endpoint}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	const data = await response.json();

	// Handle error responses
	if (!response.ok) {
		const error = data as ApiError;
		throw new ApiRequestError(
			error.error?.message ?? "An error occurred",
			error.error?.code ?? "UNKNOWN",
			response.status,
		);
	}

	return data as T;
}

// ============================================================================
// Error Class
// ============================================================================

export class ApiRequestError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number,
	) {
		super(message);
		this.name = "ApiRequestError";
	}
}

// ============================================================================
// Identity API
// ============================================================================

export interface User {
	id: string;
	username: string;
	displayName: string | null;
	avatarUrl: string | null;
	bio: string | null;
	email: string | null;
	walletAddress: string | null;
	postsCount: number;
	followersCount: number;
	followingCount: number;
	role: "user" | "admin" | "system";
	createdAt: string;
}

export interface UserSettings {
	emailNotificationsEnabled: boolean;
	pushNotificationsEnabled: boolean;
	inAppNotificationsEnabled: boolean;
	privacyProfileVisibility: "public" | "followers" | "private";
	privacyShowSocials: boolean;
	locale: string;
	theme: string;
}

export interface UserWithSettings extends User {
	farcasterFid: string | null;
	farcasterUsername: string | null;
	twitterId: string | null;
	twitterUsername: string | null;
	discordId: string | null;
	discordUsername: string | null;
	settings: UserSettings | null;
}

export interface PublicUser {
	id: string;
	username: string;
	displayName: string | null;
	avatarUrl: string | null;
	bio: string | null;
	postsCount: number;
	followersCount: number;
	followingCount: number;
	createdAt: string;
}

export const identity = {
	/**
	 * Check if a username is available
	 */
	checkUsername: (username: string) =>
		api<{ available: boolean }>(
			`/api/identity/username/${encodeURIComponent(username)}/available`,
			{ auth: false },
		),

	/**
	 * Create a new user (onboarding)
	 */
	createUser: (data: {
		username: string;
		displayName?: string;
		avatarUrl?: string;
		walletAddress?: string;
	}) =>
		api<{
			id: string;
			username: string;
			displayName: string | null;
			avatarUrl: string | null;
			createdAt: string;
		}>("/api/identity/users", { method: "POST", body: data }),

	/**
	 * Get current user profile
	 */
	getMe: () => api<UserWithSettings>("/api/identity/me"),

	/**
	 * Update current user profile
	 */
	updateMe: (data: {
		displayName?: string;
		avatarUrl?: string;
		bio?: string;
	}) => api<User>("/api/identity/me", { method: "PATCH", body: data }),

	/**
	 * Update current user settings
	 */
	updateSettings: (data: Partial<UserSettings>) =>
		api<{ success: boolean }>("/api/identity/me/settings", {
			method: "PATCH",
			body: data,
		}),

	/**
	 * Get a public user profile by username
	 */
	getUserByUsername: (username: string) =>
		api<PublicUser>(
			`/api/identity/users/by-username/${encodeURIComponent(username)}`,
			{ auth: false },
		),

	/**
	 * Get a public user profile by ID
	 */
	getUserById: (id: string) =>
		api<PublicUser>(`/api/identity/users/${id}`, { auth: false }),
};
