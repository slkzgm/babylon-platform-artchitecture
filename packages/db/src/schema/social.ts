// packages/db/src/schema/social.ts
import { relations, sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { postTypeEnum, postVisibilityEnum, reactionTypeEnum } from "./enums";
import { users } from "./identity";

// ============================================================================
// USER FOLLOWS
// Social graph - who follows whom
// ============================================================================

export const userFollows = pgTable(
	"user_follows",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		followerId: uuid("follower_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		followingId: uuid("following_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("user_follows_follower_id_idx").on(table.followerId),
		index("user_follows_following_id_idx").on(table.followingId),
		uniqueIndex("user_follows_unique_idx").on(
			table.followerId,
			table.followingId,
		),
	],
);

// ============================================================================
// POSTS
// Unified content model - posts, comments (replies), quotes, reposts
// ============================================================================

export const posts = pgTable(
	"posts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),

		// Content
		content: text("content").notNull(),
		contentMetadata: jsonb("content_metadata").$type<{
			embeds?: Array<{ type: string; url: string; title?: string }>;
			linkPreviews?: Array<{ url: string; title?: string; image?: string }>;
		}>(),
		mediaUrls: jsonb("media_urls").$type<string[]>(),

		// Type & visibility
		type: postTypeEnum("type").notNull().default("post"),
		visibility: postVisibilityEnum("visibility").notNull().default("public"),

		// Threading: comments are posts with reply_to_post_id
		// Self-references with FK constraints, onDelete: "set null" to preserve content
		// NOTE: using `as any` to break circular type dependency in Drizzle (expected).
		replyToPostId: uuid("reply_to_post_id").references((): any => posts.id, {
			onDelete: "set null",
		}),
		// Quotes: posts that quote another post with added commentary
		// NOTE: using `as any` to break circular type dependency in Drizzle (expected).
		quotePostId: uuid("quote_post_id").references((): any => posts.id, {
			onDelete: "set null",
		}),
		// Reposts: pure reshares without commentary
		// NOTE: using `as any` to break circular type dependency in Drizzle (expected).
		originalPostId: uuid("original_post_id").references((): any => posts.id, {
			onDelete: "set null",
		}),

		// Counters (denormalized, maintained by app + reconciliation job)
		likesCount: integer("likes_count").notNull().default(0),
		commentsCount: integer("comments_count").notNull().default(0),
		repostsCount: integer("reposts_count").notNull().default(0),

		// Soft delete
		deletedAt: timestamp("deleted_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("posts_author_id_idx").on(table.authorId),
		index("posts_author_id_created_at_idx").on(table.authorId, table.createdAt),
		index("posts_reply_to_post_id_idx").on(table.replyToPostId),
		index("posts_quote_post_id_idx").on(table.quotePostId),
		index("posts_original_post_id_idx").on(table.originalPostId),
		index("posts_created_at_idx").on(table.createdAt),
		index("posts_type_visibility_idx").on(table.type, table.visibility),
	],
);

// ============================================================================
// POST REACTIONS
// Reactions on posts (likes, fire, etc.)
// ============================================================================

export const postReactions = pgTable(
	"post_reactions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		type: reactionTypeEnum("type").notNull().default("like"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("post_reactions_post_id_idx").on(table.postId),
		index("post_reactions_user_id_idx").on(table.userId),
		uniqueIndex("post_reactions_unique_idx").on(
			table.userId,
			table.postId,
			table.type,
		),
	],
);

// ============================================================================
// POST MENTIONS
// Track @mentions for notifications and queries
// ============================================================================

export const postMentions = pgTable(
	"post_mentions",
	{
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		mentionedUserId: uuid("mentioned_user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.mentionedUserId] }),
		index("post_mentions_post_id_idx").on(table.postId),
		index("post_mentions_mentioned_user_id_idx").on(table.mentionedUserId),
	],
);

// ============================================================================
// TAGS
// Hashtags for content categorization
// ============================================================================

export const tags = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 100 }).notNull().unique(),
		postsCount: integer("posts_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("tags_name_idx").on(table.name),
		// Enforce lowercase tag names at DB level
		check(
			"tags_name_lowercase_check",
			sql`${table.name} = lower(${table.name})`,
		),
	],
);

// ============================================================================
// POST TAGS
// Junction table for posts <-> tags many-to-many
// ============================================================================

export const postTags = pgTable(
	"post_tags",
	{
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tagId] }),
		index("post_tags_tag_id_idx").on(table.tagId),
	],
);

// ============================================================================
// BOOKMARKS
// Saved posts for users
// ============================================================================

export const bookmarks = pgTable(
	"bookmarks",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		postId: uuid("post_id")
			.notNull()
			.references(() => posts.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.postId] }),
		index("bookmarks_user_id_idx").on(table.userId),
		index("bookmarks_user_id_created_at_idx").on(table.userId, table.createdAt),
	],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
	follower: one(users, {
		fields: [userFollows.followerId],
		references: [users.id],
		relationName: "follower",
	}),
	following: one(users, {
		fields: [userFollows.followingId],
		references: [users.id],
		relationName: "following",
	}),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id],
	}),
	// Self-referential relations for threading
	replyToPost: one(posts, {
		fields: [posts.replyToPostId],
		references: [posts.id],
		relationName: "postReplies",
	}),
	replies: many(posts, {
		relationName: "postReplies",
	}),
	quotePost: one(posts, {
		fields: [posts.quotePostId],
		references: [posts.id],
		relationName: "postQuotes",
	}),
	quotes: many(posts, {
		relationName: "postQuotes",
	}),
	originalPost: one(posts, {
		fields: [posts.originalPostId],
		references: [posts.id],
		relationName: "postReposts",
	}),
	reposts: many(posts, {
		relationName: "postReposts",
	}),
	reactions: many(postReactions),
	mentions: many(postMentions),
	postTags: many(postTags),
	bookmarkedBy: many(bookmarks),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
	user: one(users, {
		fields: [postReactions.userId],
		references: [users.id],
	}),
	post: one(posts, {
		fields: [postReactions.postId],
		references: [posts.id],
	}),
}));

export const postMentionsRelations = relations(postMentions, ({ one }) => ({
	post: one(posts, {
		fields: [postMentions.postId],
		references: [posts.id],
	}),
	mentionedUser: one(users, {
		fields: [postMentions.mentionedUserId],
		references: [users.id],
	}),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id],
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id],
	}),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
	user: one(users, {
		fields: [bookmarks.userId],
		references: [users.id],
	}),
	post: one(posts, {
		fields: [bookmarks.postId],
		references: [posts.id],
	}),
}));
