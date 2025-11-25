import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { profileVisibilityEnum, userRoleEnum } from "./enums";

// ============================================================================
// USERS
// Core identity table - contains all frequently accessed user data
// ============================================================================

export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),

		// Auth (Privy)
		privyUserId: varchar("privy_user_id", { length: 255 }).notNull().unique(),
		email: varchar("email", { length: 255 }).unique(),

		// Profile
		username: varchar("username", { length: 50 }).notNull().unique(),
		displayName: varchar("display_name", { length: 100 }),
		avatarUrl: text("avatar_url"),
		bio: text("bio"),

		// Wallet
		walletAddress: varchar("wallet_address", { length: 42 }).unique(),

		// Linked socials (denormalized for quick access)
		farcasterFid: varchar("farcaster_fid", { length: 50 }),
		farcasterUsername: varchar("farcaster_username", { length: 100 }),
		twitterId: varchar("twitter_id", { length: 50 }),
		twitterUsername: varchar("twitter_username", { length: 100 }),
		discordId: varchar("discord_id", { length: 50 }),
		discordUsername: varchar("discord_username", { length: 100 }),

		// Counters (denormalized, maintained by app + reconciliation job)
		postsCount: integer("posts_count").notNull().default(0),
		followersCount: integer("followers_count").notNull().default(0),
		followingCount: integer("following_count").notNull().default(0),

		// Role & flags
		role: userRoleEnum("role").notNull().default("user"),
		isBanned: boolean("is_banned").notNull().default(false),
		isTest: boolean("is_test").notNull().default(false),

		// Public score for leaderboard (denormalized from user_balances)
		publicPointsScore: integer("public_points_score").notNull().default(0),

		// Soft delete
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => [
		index("users_username_idx").on(table.username),
		index("users_privy_user_id_idx").on(table.privyUserId),
		index("users_wallet_address_idx").on(table.walletAddress),
		index("users_banned_deleted_idx").on(table.isBanned, table.deletedAt),
		index("users_public_points_score_idx").on(table.publicPointsScore),
	],
);

// ============================================================================
// USER SETTINGS
// Private preferences and configuration (1:1 with users)
// ============================================================================

export const userSettings = pgTable("user_settings", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),

	// Notifications
	emailNotificationsEnabled: boolean("email_notifications_enabled")
		.notNull()
		.default(true),
	pushNotificationsEnabled: boolean("push_notifications_enabled")
		.notNull()
		.default(true),
	inAppNotificationsEnabled: boolean("in_app_notifications_enabled")
		.notNull()
		.default(true),

	// Privacy
	privacyProfileVisibility: profileVisibilityEnum("privacy_profile_visibility")
		.notNull()
		.default("public"),
	privacyShowSocials: boolean("privacy_show_socials").notNull().default(true),

	// Preferences
	locale: varchar("locale", { length: 10 }).default("en"),
	theme: varchar("theme", { length: 20 }).default("system"),

	// Feature flags (flexible jsonb for A/B tests, beta features, etc.)
	featureFlags: jsonb("feature_flags").$type<Record<string, boolean>>(),

	// Legal
	tosAcceptedAt: timestamp("tos_accepted_at", { withTimezone: true }),
	privacyPolicyAcceptedAt: timestamp("privacy_policy_accepted_at", {
		withTimezone: true,
	}),

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

export const usersRelations = relations(users, ({ one }) => ({
	settings: one(userSettings, {
		fields: [users.id],
		references: [userSettings.userId],
	}),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id],
	}),
}));
