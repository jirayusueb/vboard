import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	pgEnum,
	serial,
	customType,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Custom type for binary data (CRDT snapshots)
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return "bytea";
	},
	toDriver(value: Buffer): Buffer {
		return value;
	},
	fromDriver(value: Buffer): Buffer {
		return value;
	},
});

// Enums
export const boardVisibilityEnum = pgEnum("board_visibility", [
	"public",
	"private",
]);

export const memberRoleEnum = pgEnum("member_role", [
	"owner",
	"editor",
	"viewer",
]);

// Tables
export const board = pgTable(
	"board",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		visibility: boardVisibilityEnum("visibility").notNull().default("private"),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("board_ownerId_idx").on(table.ownerId)],
);

export const boardMember = pgTable(
	"board_member",
	{
		id: text("id").primaryKey(),
		boardId: text("board_id")
			.notNull()
			.references(() => board.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: memberRoleEnum("role").notNull().default("viewer"),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("board_member_boardId_userId_unq").on(
			table.boardId,
			table.userId,
		),
		index("board_member_userId_idx").on(table.userId),
	],
);

export const boardSnapshot = pgTable(
	"board_snapshot",
	{
		id: serial("id").primaryKey(),
		boardId: text("board_id")
			.notNull()
			.references(() => board.id, { onDelete: "cascade" }),
		data: bytea("data").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("board_snapshot_boardId_idx").on(table.boardId)],
);

export const boardInvite = pgTable(
	"board_invite",
	{
		id: text("id").primaryKey(),
		boardId: text("board_id")
			.notNull()
			.references(() => board.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		role: memberRoleEnum("role").notNull().default("editor"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at"),
	},
	(table) => [
		index("board_invite_boardId_idx").on(table.boardId),
		uniqueIndex("board_invite_token_unq").on(table.token),
	],
);

// Relations
export const boardRelations = relations(board, ({ one, many }) => ({
	owner: one(user, {
		fields: [board.ownerId],
		references: [user.id],
	}),
	members: many(boardMember),
	snapshots: many(boardSnapshot),
	invites: many(boardInvite),
}));

export const boardMemberRelations = relations(boardMember, ({ one }) => ({
	board: one(board, {
		fields: [boardMember.boardId],
		references: [board.id],
	}),
	user: one(user, {
		fields: [boardMember.userId],
		references: [user.id],
	}),
}));

export const boardSnapshotRelations = relations(boardSnapshot, ({ one }) => ({
	board: one(board, {
		fields: [boardSnapshot.boardId],
		references: [board.id],
	}),
}));

export const boardInviteRelations = relations(boardInvite, ({ one }) => ({
	board: one(board, {
		fields: [boardInvite.boardId],
		references: [board.id],
	}),
}));
