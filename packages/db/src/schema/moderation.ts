import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appealStatusEnum } from "./enums";
import { users } from "./identity";

// ============================================================================
// USER MODERATION STATUS
// Detailed moderation info (0:1 with users - only exists if user was moderated)
// Note: users.is_banned is the source of truth for runtime checks
// ============================================================================

export const userModerationStatus = pgTable("user_moderation_status", {
	userId: uuid("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),

	// Ban details (the actual ban flag is on users.is_banned)
	bannedAt: timestamp("banned_at", { withTimezone: true }),
	bannedReason: text("banned_reason"),
	bannedBy: uuid("banned_by").references(() => users.id, {
		onDelete: "set null",
	}),

	// Appeal system
	appealStatus: appealStatusEnum("appeal_status").notNull().default("none"),
	appealCount: integer("appeal_count").notNull().default(0),
	appealReason: text("appeal_reason"),
	appealSubmittedAt: timestamp("appeal_submitted_at", { withTimezone: true }),

	// Review tracking
	lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
	lastReviewedBy: uuid("last_reviewed_by").references(() => users.id, {
		onDelete: "set null",
	}),
	reviewNotes: text("review_notes"),

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

export const userModerationStatusRelations = relations(
	userModerationStatus,
	({ one }) => ({
		user: one(users, {
			fields: [userModerationStatus.userId],
			references: [users.id],
		}),
		bannedByUser: one(users, {
			fields: [userModerationStatus.bannedBy],
			references: [users.id],
		}),
		reviewedByUser: one(users, {
			fields: [userModerationStatus.lastReviewedBy],
			references: [users.id],
		}),
	}),
);
