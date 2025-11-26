// packages/shared/utils/src/validation.ts

// ============================================================================
// UUID Validation
// ============================================================================

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID v4
 */
export function isUUID(value: string): boolean {
	return UUID_REGEX.test(value);
}

/**
 * Assert that a value is a valid UUID
 * @throws Error if not a valid UUID
 */
export function assertUUID(value: string, name = "value"): asserts value {
	if (!isUUID(value)) {
		throw new Error(`${name} must be a valid UUID, got: ${value}`);
	}
}

// ============================================================================
// Privy DID Validation
// ============================================================================

const PRIVY_DID_REGEX = /^did:privy:[a-zA-Z0-9]+$/;

/**
 * Check if a string is a valid Privy DID
 */
export function isPrivyDID(value: string): boolean {
	return PRIVY_DID_REGEX.test(value);
}

/**
 * Assert that a value is a valid Privy DID
 * @throws Error if not a valid Privy DID
 */
export function assertPrivyDID(value: string, name = "value"): asserts value {
	if (!isPrivyDID(value)) {
		throw new Error(`${name} must be a valid Privy DID, got: ${value}`);
	}
}

// ============================================================================
// Ethereum Address Validation
// ============================================================================

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Check if a string is a valid Ethereum address
 */
export function isEthAddress(value: string): boolean {
	return ETH_ADDRESS_REGEX.test(value);
}

/**
 * Assert that a value is a valid Ethereum address
 * @throws Error if not a valid address
 */
export function assertEthAddress(value: string, name = "value"): asserts value {
	if (!isEthAddress(value)) {
		throw new Error(`${name} must be a valid Ethereum address, got: ${value}`);
	}
}

// ============================================================================
// Content Validation
// ============================================================================

export const CONTENT_LIMITS = {
	POST_CONTENT: 5000,
	BIO: 500,
	DISPLAY_NAME: 100,
	USERNAME: 50,
	TAG_NAME: 100,
} as const;

/**
 * Validate post content length
 * @throws Error if content exceeds limit
 */
export function validatePostContent(
	content: string,
	context?: string,
): asserts content is string {
	if (typeof content !== "string") {
		throw new Error(`${context ? `${context}: ` : ""}Content must be a string`);
	}
	if (content.length === 0) {
		throw new Error(`${context ? `${context}: ` : ""}Content cannot be empty`);
	}
	if (content.length > CONTENT_LIMITS.POST_CONTENT) {
		throw new Error(
			`${context ? `${context}: ` : ""}Content exceeds ${CONTENT_LIMITS.POST_CONTENT} characters`,
		);
	}
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

/**
 * Check if a value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}
