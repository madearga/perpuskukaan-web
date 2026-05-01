import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    telegramId: v.optional(v.string()),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
    reputation: v.optional(v.number()),
    totalBooksShared: v.optional(v.number()),
    totalBorrows: v.optional(v.number()),
    totalLends: v.optional(v.number()),
    isVerified: v.optional(v.boolean()),
    role: v.string(),
    linkedUserIds: v.optional(v.array(v.id("users"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("email", ["email"])
    .index("by_telegram_id", ["telegramId"])
    .index("by_username", ["username"]),

  books: defineTable({
    ownerId: v.id("users"),
    title: v.string(),
    author: v.string(),
    isbn: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.string(),
    condition: v.string(),
    coverImage: v.optional(v.string()),
    status: v.string(),
    mode: v.string(),
    language: v.string(),
    fictionType: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_language", ["language"])
    .index("by_fiction_type", ["fictionType"])
    .searchIndex("search_books", {
      searchField: "title",
      filterFields: ["status", "category", "language", "fictionType"],
    })
    .searchIndex("search_authors", {
      searchField: "author",
      filterFields: ["status", "category", "language", "fictionType"],
    }),

  borrowRequests: defineTable({
    bookId: v.id("books"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    message: v.optional(v.string()),
    durationDays: v.number(),
    status: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_book", ["bookId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"]),

  transactions: defineTable({
    bookId: v.id("books"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    requestId: v.id("borrowRequests"),
    borrowDate: v.number(),
    dueDate: v.number(),
    returnDate: v.optional(v.number()),
    status: v.string(),
    lastReminderDate: v.optional(v.number()),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_status", ["status"]),

  reviews: defineTable({
    transactionId: v.id("transactions"),
    reviewerId: v.id("users"),
    revieweeId: v.id("users"),
    bookId: v.id("books"),
    rating: v.number(),
    comment: v.optional(v.string()),
    type: v.string(),
    createdAt: v.number(),
  })
    .index("by_book", ["bookId"])
    .index("by_reviewee", ["revieweeId"]),

  wishlist: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_book", ["bookId"]),
});
