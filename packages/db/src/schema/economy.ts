import { relations } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { pointsTransactionTypeEnum } from "./enums";
import { users } from "./identity";

// ============================================================================
// USER BALANCES
// Aggregated balance per user (1:1 with users)
// ============================================================================

export const userBalances = pgTable("user_balances", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),

	// Points (integers)
	virtualBalance: integer("virtual_balance").notNull().default(0),
	earnedPoints: integer("earned_points").notNull().default(0),
	bonusPoints: integer("bonus_points").notNull().default(0),

	// Financial values (numeric for precision - no floats!)
	lifetimePnl: numeric("lifetime_pnl", { precision: 18, scale: 2 })
		.notNull()
		.default("0"),
	totalDeposited: numeric("total_deposited", { precision: 18, scale: 2 })
		.notNull()
		.default("0"),
	totalWithdrawn: numeric("total_withdrawn", { precision: 18, scale: 2 })
		.notNull()
		.default("0"),

	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

// ============================================================================
// POINTS TRANSACTIONS
// Immutable ledger for audit & recomputation
// ============================================================================

export const pointsTransactions = pgTable(
	"points_transactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		type: pointsTransactionTypeEnum("type").notNull(),
		amount: integer("amount").notNull(),

		// Source of the transaction (e.g., 'mission', 'trade', 'referral', 'airdrop')
		source: varchar("source", { length: 50 }).notNull(),

		// Flexible metadata for context
		metadata: jsonb("metadata").$type<Record<string, unknown>>(),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("points_transactions_user_id_idx").on(table.userId),
		index("points_transactions_user_id_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
		index("points_transactions_type_idx").on(table.type),
		index("points_transactions_source_idx").on(table.source),
	],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userBalancesRelations = relations(userBalances, ({ one }) => ({
	user: one(users, {
		fields: [userBalances.userId],
		references: [users.id],
	}),
}));

export const pointsTransactionsRelations = relations(
	pointsTransactions,
	({ one }) => ({
		user: one(users, {
			fields: [pointsTransactions.userId],
			references: [users.id],
		}),
	}),
);
