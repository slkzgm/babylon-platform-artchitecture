// packages/shared/utils/src/types.ts

// ============================================================================
// JSON Types
// ============================================================================

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

// ============================================================================
// Utility Types
// ============================================================================

/** Make specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specific properties required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;

/** Extract non-undefined keys */
export type NonNullableKeys<T> = {
	[K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

/** Generic string record */
export type StringRecord<T = unknown> = Record<string, T>;

/** Brand a primitive type for nominal typing */
export type Brand<T, B> = T & { readonly __brand: B };

/** UUID branded type */
export type UUID = Brand<string, "UUID">;

/** Privy DID branded type */
export type PrivyDID = Brand<string, "PrivyDID">;

// ============================================================================
// Result Type (Railway-oriented programming)
// ============================================================================

export type Result<T, E = Error> =
	| { ok: true; value: T }
	| { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const Err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: JsonValue;
	};
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	cursor?: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
	nextCursor?: string;
}

// ============================================================================
// Error-like Type
// ============================================================================

export interface ErrorLike {
	message?: string;
	name?: string;
	stack?: string;
	code?: string | number;
	cause?: unknown;
}

export function isErrorLike(value: unknown): value is ErrorLike {
	return (
		typeof value === "object" &&
		value !== null &&
		("message" in value || "name" in value || "code" in value)
	);
}
