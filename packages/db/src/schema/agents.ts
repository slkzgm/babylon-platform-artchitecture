import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { agentStatusEnum } from "./enums";
import { users } from "./identity";

// ============================================================================
// USER AGENTS
// Agent configuration for users who have enabled AI agents (0:1 with users)
// ============================================================================

export const userAgents = pgTable("user_agents", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),

	// Status
	isEnabled: boolean("is_enabled").notNull().default(false),
	status: agentStatusEnum("status").notNull().default("idle"),

	// Configuration (jsonb for flexibility)
	personality: jsonb("personality").$type<{
		traits?: string[];
		style?: string;
		tone?: string;
	}>(),
	tradingStrategy: jsonb("trading_strategy").$type<{
		riskTolerance?: "low" | "medium" | "high";
		maxPositionSize?: number;
		preferredMarkets?: string[];
	}>(),
	constraints: jsonb("constraints").$type<{
		maxActionsPerTick?: number;
		allowedActions?: string[];
		blockedActions?: string[];
	}>(),

	// Model tier (e.g., 'free', 'pro', 'enterprise')
	modelTier: varchar("model_tier", { length: 20 }).notNull().default("free"),

	// Agent-specific points balance (separate from user points)
	pointsBalance: integer("points_balance").notNull().default(0),

	// Error tracking
	lastError: varchar("last_error", { length: 500 }),
	lastErrorAt: timestamp("last_error_at", { withTimezone: true }),

	// Activity tracking
	lastTickAt: timestamp("last_tick_at", { withTimezone: true }),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const userAgentsRelations = relations(userAgents, ({ one }) => ({
	user: one(users, {
		fields: [userAgents.userId],
		references: [users.id],
	}),
}));
