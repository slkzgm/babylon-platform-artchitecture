// packages/shared/infra/src/errors.ts
import type { JsonValue } from "@babylon/shared-utils";

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
	// Generic
	INTERNAL_ERROR: "INTERNAL_ERROR",
	BAD_REQUEST: "BAD_REQUEST",
	NOT_FOUND: "NOT_FOUND",
	CONFLICT: "CONFLICT",

	// Auth
	UNAUTHORIZED: "UNAUTHORIZED",
	FORBIDDEN: "FORBIDDEN",
	INVALID_TOKEN: "INVALID_TOKEN",
	EXPIRED_TOKEN: "EXPIRED_TOKEN",

	// Validation
	VALIDATION_ERROR: "VALIDATION_ERROR",
	INVALID_INPUT: "INVALID_INPUT",

	// Rate limiting
	RATE_LIMITED: "RATE_LIMITED",

	// Database
	DATABASE_ERROR: "DATABASE_ERROR",

	// External services
	EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// Base Error Class
// ============================================================================

export interface BabylonErrorOptions {
	code: ErrorCode;
	statusCode: number;
	message: string;
	context?: Record<string, unknown>;
	cause?: Error;
	isOperational?: boolean;
}

export class BabylonError extends Error {
	readonly code: ErrorCode;
	readonly statusCode: number;
	readonly context?: Record<string, unknown>;
	readonly timestamp: Date;
	readonly isOperational: boolean;

	constructor(options: BabylonErrorOptions) {
		super(options.message);
		this.name = "BabylonError";
		this.code = options.code;
		this.statusCode = options.statusCode;
		this.context = options.context;
		this.timestamp = new Date();
		this.isOperational = options.isOperational ?? true;

		if (options.cause) {
			this.cause = options.cause;
		}

		// Maintains proper stack trace for where error was thrown
		Error.captureStackTrace?.(this, this.constructor);
	}

	toJSON(): JsonValue {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			statusCode: this.statusCode,
			context: this.context ?? null,
			timestamp: this.timestamp.toISOString(),
		};
	}
}

// ============================================================================
// Specific Error Classes
// ============================================================================

export class ValidationError extends BabylonError {
	constructor(
		message: string,
		context?: Record<string, unknown>,
		cause?: Error,
	) {
		super({
			code: ErrorCodes.VALIDATION_ERROR,
			statusCode: 400,
			message,
			context,
			cause,
		});
		this.name = "ValidationError";
	}
}

export class NotFoundError extends BabylonError {
	constructor(resource: string, id?: string) {
		super({
			code: ErrorCodes.NOT_FOUND,
			statusCode: 404,
			message: id ? `${resource} not found: ${id}` : `${resource} not found`,
			context: { resource, id },
		});
		this.name = "NotFoundError";
	}
}

export class UnauthorizedError extends BabylonError {
	constructor(message = "Authentication required") {
		super({
			code: ErrorCodes.UNAUTHORIZED,
			statusCode: 401,
			message,
		});
		this.name = "UnauthorizedError";
	}
}

export class ForbiddenError extends BabylonError {
	constructor(message = "Access denied", context?: Record<string, unknown>) {
		super({
			code: ErrorCodes.FORBIDDEN,
			statusCode: 403,
			message,
			context,
		});
		this.name = "ForbiddenError";
	}
}

export class ConflictError extends BabylonError {
	constructor(message: string, context?: Record<string, unknown>) {
		super({
			code: ErrorCodes.CONFLICT,
			statusCode: 409,
			message,
			context,
		});
		this.name = "ConflictError";
	}
}

export class RateLimitError extends BabylonError {
	readonly retryAfter: number;

	constructor(retryAfter: number, message = "Too many requests") {
		super({
			code: ErrorCodes.RATE_LIMITED,
			statusCode: 429,
			message,
			context: { retryAfter },
		});
		this.name = "RateLimitError";
		this.retryAfter = retryAfter;
	}
}

export class DatabaseError extends BabylonError {
	constructor(message: string, cause?: Error) {
		super({
			code: ErrorCodes.DATABASE_ERROR,
			statusCode: 500,
			message,
			cause,
			isOperational: false,
		});
		this.name = "DatabaseError";
	}
}

export class ExternalServiceError extends BabylonError {
	constructor(service: string, message: string, cause?: Error) {
		super({
			code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
			statusCode: 502,
			message: `${service}: ${message}`,
			context: { service },
			cause,
		});
		this.name = "ExternalServiceError";
	}
}

// ============================================================================
// Type Guards
// ============================================================================

export function isBabylonError(error: unknown): error is BabylonError {
	return error instanceof BabylonError;
}

export function isOperationalError(error: unknown): boolean {
	return isBabylonError(error) && error.isOperational;
}

// ============================================================================
// Error Response Helper
// ============================================================================

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: JsonValue;
	};
}

export function toErrorResponse(error: unknown): ErrorResponse {
	if (isBabylonError(error)) {
		return {
			success: false,
			error: {
				code: error.code,
				message: error.message,
				details: error.context as JsonValue,
			},
		};
	}

	if (error instanceof Error) {
		return {
			success: false,
			error: {
				code: ErrorCodes.INTERNAL_ERROR,
				message:
					process.env.NODE_ENV === "production"
						? "An unexpected error occurred"
						: error.message,
			},
		};
	}

	return {
		success: false,
		error: {
			code: ErrorCodes.INTERNAL_ERROR,
			message: "An unexpected error occurred",
		},
	};
}
