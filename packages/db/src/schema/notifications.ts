import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "./enums";
import { users } from "./identity";
import { posts } from "./social";

// ============================================================================
// NOTIFICATIONS
// Generic notifications table for all in-app notifications
// ============================================================================

export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),

		// Recipient
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// Type of notification
		type: notificationTypeEnum("type").notNull(),

		// Actor who triggered the notification (nullable for system notifications)
		actorId: uuid("actor_id").references(() => users.id, {
			onDelete: "set null",
		}),

		// Related post (nullable)
		postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),

		// Read status
		isRead: boolean("is_read").notNull().default(false),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("notifications_user_id_idx").on(table.userId),
		index("notifications_user_id_is_read_idx").on(table.userId, table.isRead),
		index("notifications_user_id_created_at_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

// ============================================================================
// USER BLOCKS
// Hard block - "I don't want to see or be seen by this user"
// ============================================================================

export const userBlocks = pgTable(
	"user_blocks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		blockerId: uuid("blocker_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		blockedId: uuid("blocked_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_blocks_blocker_id_idx").on(table.blockerId),
		index("user_blocks_blocked_id_idx").on(table.blockedId),
		uniqueIndex("user_blocks_unique_idx").on(table.blockerId, table.blockedId),
	],
);

// ============================================================================
// USER MUTES
// Soft mute - "I don't want to see this user's content in my feed/notifications"
// ============================================================================

export const userMutes = pgTable(
	"user_mutes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		muterId: uuid("muter_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		mutedId: uuid("muted_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_mutes_muter_id_idx").on(table.muterId),
		index("user_mutes_muted_id_idx").on(table.mutedId),
		uniqueIndex("user_mutes_unique_idx").on(table.muterId, table.mutedId),
	],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
	}),
	actor: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
	}),
	post: one(posts, {
		fields: [notifications.postId],
		references: [posts.id],
	}),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
	blocker: one(users, {
		fields: [userBlocks.blockerId],
		references: [users.id],
		relationName: "blocker",
	}),
	blocked: one(users, {
		fields: [userBlocks.blockedId],
		references: [users.id],
		relationName: "blocked",
	}),
}));

export const userMutesRelations = relations(userMutes, ({ one }) => ({
	muter: one(users, {
		fields: [userMutes.muterId],
		references: [users.id],
		relationName: "muter",
	}),
	muted: one(users, {
		fields: [userMutes.mutedId],
		references: [users.id],
		relationName: "muted",
	}),
}));
