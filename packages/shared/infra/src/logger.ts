// packages/shared/infra/src/logger.ts
// NOTE: logger reads LOG_LEVEL directly from process.env.
// This is intentional and matches the project's current bootstrapping model.
import type { JsonValue } from "@babylon/shared-utils";

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: string;
	data?: JsonValue;
	error?: {
		name: string;
		message: string;
		stack?: string;
	};
}

type LogData = JsonValue | Error | Record<string, unknown>;

// ============================================================================
// Log Level Priority
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

// ============================================================================
// Safe Serialization
// ============================================================================

function safeStringify(value: unknown): string {
	const seen = new WeakSet();

	return JSON.stringify(value, (_, val) => {
		// Handle circular references
		if (typeof val === "object" && val !== null) {
			if (seen.has(val)) {
				return "[Circular]";
			}
			seen.add(val);
		}

		// Handle Error objects
		if (val instanceof Error) {
			return {
				name: val.name,
				message: val.message,
				stack: val.stack,
			};
		}

		// Handle BigInt
		if (typeof val === "bigint") {
			return val.toString();
		}

		return val;
	});
}

function serializeData(data: LogData | undefined): JsonValue | undefined {
	if (data === undefined) return undefined;

	if (data instanceof Error) {
		return {
			name: data.name,
			message: data.message,
			stack: data.stack,
		};
	}

	// Parse and re-stringify to ensure it's valid JSON
	try {
		return JSON.parse(safeStringify(data));
	} catch {
		return String(data);
	}
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
	private level: LogLevel;
	private context?: string;
	private useJson: boolean;

	constructor(options: { level?: LogLevel; context?: string } = {}) {
		this.level =
			options.level ??
			(process.env.LOG_LEVEL as LogLevel) ??
			(process.env.NODE_ENV === "production" ? "info" : "debug");
		this.context = options.context;
		this.useJson = process.env.NODE_ENV === "production";
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
	}

	private formatEntry(entry: LogEntry): string {
		if (this.useJson) {
			return safeStringify(entry);
		}

		// Human-readable format for development
		const parts = [
			`[${entry.timestamp}]`,
			`[${entry.level.toUpperCase()}]`,
			entry.context ? `[${entry.context}]` : "",
			entry.message,
		].filter(Boolean);

		let output = parts.join(" ");

		if (entry.data) {
			output += `\n${safeStringify(entry.data)}`;
		}

		if (entry.error) {
			output += `\n${entry.error.stack ?? entry.error.message}`;
		}

		return output;
	}

	private log(
		level: LogLevel,
		message: string,
		data?: LogData,
		context?: string,
	): void {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context: context ?? this.context,
		};

		// Handle Error in data
		if (data instanceof Error) {
			entry.error = {
				name: data.name,
				message: data.message,
				stack: data.stack,
			};
		} else if (data !== undefined) {
			entry.data = serializeData(data);
		}

		const formatted = this.formatEntry(entry);

		switch (level) {
			case "debug":
			case "info":
				console.log(formatted);
				break;
			case "warn":
				console.warn(formatted);
				break;
			case "error":
				console.error(formatted);
				break;
		}
	}

	debug(message: string, data?: LogData, context?: string): void {
		this.log("debug", message, data, context);
	}

	info(message: string, data?: LogData, context?: string): void {
		this.log("info", message, data, context);
	}

	warn(message: string, data?: LogData, context?: string): void {
		this.log("warn", message, data, context);
	}

	error(message: string, data?: LogData, context?: string): void {
		this.log("error", message, data, context);
	}

	/**
	 * Create a child logger with a specific context
	 */
	child(context: string): Logger {
		return new Logger({ level: this.level, context });
	}

	/**
	 * Set the log level at runtime
	 */
	setLevel(level: LogLevel): void {
		this.level = level;
	}

	/**
	 * Get the current log level
	 */
	getLevel(): LogLevel {
		return this.level;
	}
}

// ============================================================================
// Singleton Export
// ============================================================================

export const logger = new Logger();

/**
 * Create a logger with a specific context
 * @example const log = createLogger("AuthService");
 */
export function createLogger(context: string): Logger {
	return logger.child(context);
}
