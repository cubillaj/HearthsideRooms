import { relations } from "drizzle-orm";
import { integer, serial, varchar, pgTable, timestamp, text, primaryKey, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

const timeStamps = {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().$onUpdate(() => new Date()).notNull()
}

const roleEnum = pgEnum('role', [
    'super_admin',
    'user'
])

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 100}),
    name: varchar('name', { length: 50}).notNull(),
    middleName: varchar('middlename', { length: 50}),
    lastName: varchar('last_name', { length: 50}).notNull(),
    email: varchar('email', { length: 100}).unique().notNull(),
    password: varchar('password', { length: 150}).notNull(),
    role: roleEnum('role').default('user').notNull(),
    status: varchar('status', { length: 20}).default('active').notNull(),
    ...timeStamps
}, (table) => ({
    usernameIdx: index('users_username_idx')
        .on(table.username),
    statusIdx: index('users_status_idx')
        .on(table.status),
    createdAt: index('users_created_at_idx')
        .on(table.createdAt),
}))

export const refreshTokens = pgTable('refresh_token', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
})

export const rooms = pgTable('rooms', {
    id: serial('id').primaryKey().notNull(),
    roomName: varchar('room_name', { length: 100}).notNull().unique(),
    roomPassword: varchar('room_password', { length: 100}),
    createdBy: integer('created_by').references(() => users.id).notNull(),
    ...timeStamps
})

export const roomMembers = pgTable('room_member', {
    userId: integer('user_id').references(() => users.id ).notNull(),
    roomId: integer('room_id').references(() => rooms.id, {onDelete: 'cascade'}).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
},
 (table) => ({
    pk: primaryKey({
        columns: [table.userId, table.roomId]
    }),
 })
)

export const messages = pgTable('messages', {
    id: serial('id').primaryKey().notNull(),
    roomId: integer('room_id').references(() => rooms.id, {onDelete: 'cascade'}).notNull(),
    message: text('message').notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    ...timeStamps
})

export const messageReads = pgTable('messageReads', {
    userId: integer('user_id').references(() => users.id).notNull(),
    messageId: integer('message_id').references(() => messages.id, {onDelete: 'cascade'}).notNull(),
    readAt: timestamp('read_at').defaultNow().notNull()
},
    (table) => ({
        pk: primaryKey({
            columns: [table.userId, table.messageId]
        })
    })
)

export const userRelations = relations(users, ({ many}) => {
    return {
        createdRooms: many(rooms),
        messages: many(messages),
        roomMembers: many(roomMembers),
        messageReads: many(messageReads)
    }
})

export const tokenRelations = relations(refreshTokens, ({ one}) => {
    return {
        user: one(users, {
            fields: [refreshTokens.userId],
            references: [users.id]
        })
    }
})

export const roomRelations = relations(rooms, ({ one, many }) => {
    return {
        creator: one(users, {
            fields: [rooms.createdBy],
            references: [users.id]
        }),
        messages: many(messages),
        roomMembers: many(roomMembers)
    }
})

export const messageRelations = relations(messages, ({one, many}) => {
    return {
        room: one(rooms, {
            fields: [messages.roomId],
            references: [rooms.id]
        }),
        user: one(users, {
            fields: [messages.userId],
            references: [users.id]
        }),
        messageReads: many(messageReads)
    }
})

export const roomMembersRelations = relations(roomMembers, ( { one }) => {
    return {
        user: one(users, {
            fields: [roomMembers.userId],
            references: [users.id]
        }),
        room: one(rooms, {
            fields: [roomMembers.roomId],
            references: [rooms.id]
        })
    }
})

export const messageReadsRelations = relations(messageReads, ({ one }) => {
    return {
        user: one(users, {
            fields: [messageReads.userId],
            references: [users.id]
        }),
        message: one(messages, {
            fields: [messageReads.messageId],
            references: [messages.id]
        })
    }
})

export type Token = typeof refreshTokens.$inferSelect
export type NewToken = typeof refreshTokens.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Room = typeof rooms.$inferSelect
export type NewRoom = typeof rooms.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type RoomMember = typeof roomMembers.$inferSelect
export type NewRoomMember = typeof roomMembers.$inferInsert
