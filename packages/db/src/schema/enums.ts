import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================================
// Identity & Users
// ============================================================================

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "system"]);

// ============================================================================
// Economy
// ============================================================================

export const pointsTransactionTypeEnum = pgEnum("points_transaction_type", [
	"earn",
	"spend",
	"bonus",
	"adjustment",
]);

// ============================================================================
// Agents
// ============================================================================

export const agentStatusEnum = pgEnum("agent_status", [
	"idle",
	"running",
	"paused",
	"error",
]);

// ============================================================================
// Moderation
// ============================================================================

export const appealStatusEnum = pgEnum("appeal_status", [
	"none",
	"pending",
	"denied",
	"approved",
]);

// ============================================================================
// Social / Posts
// ============================================================================

export const postTypeEnum = pgEnum("post_type", ["post", "system", "agent"]);

export const postVisibilityEnum = pgEnum("post_visibility", [
	"public",
	"followers",
	"private",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
	"like",
	"fire",
	"upvote",
	"downvote",
]);

// ============================================================================
// Notifications
// ============================================================================

export const notificationTypeEnum = pgEnum("notification_type", [
	"like",
	"reaction",
	"reply",
	"quote",
	"repost",
	"follow",
	"mention",
	"system",
]);

// ============================================================================
// Settings
// ============================================================================

export const profileVisibilityEnum = pgEnum("profile_visibility", [
	"public",
	"followers",
	"private",
]);
