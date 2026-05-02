import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const requestBorrow = mutation({
  args: {
    telegramId: v.string(),
    bookId: v.id("books"),
    message: v.optional(v.string()),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const borrower = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    
    if (!borrower) return { success: false, message: "User not registered" };

    const book = await ctx.db.get(args.bookId);
    if (!book) return { success: false, message: "Book not found" };
    if (book.status !== "available") return { success: false, message: "Book not available" };
    if (book.ownerId === borrower._id) return { success: false, message: "Cannot borrow your own book" };

    const requestId = await ctx.db.insert("borrowRequests", {
      bookId: args.bookId,
      borrowerId: borrower._id,
      lenderId: book.ownerId,
      message: args.message,
      durationDays: args.durationDays,
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.bookId, { status: "reserved", updatedAt: Date.now() });
    
    const lender = await ctx.db.get(book.ownerId);
    return { success: true, requestId, book, lender, borrower };
  },
});

export const acceptRequest = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    telegramId: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { success: false, message: "Request not found" };
    if (request.status !== "pending") return { success: false, message: "Request already processed" };

    const lender = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!lender || lender._id !== request.lenderId) return { success: false, message: "Unauthorized" };

    const now = Date.now();
    const dueDate = now + request.durationDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.requestId, { status: "accepted", respondedAt: now });

    const transactionId = await ctx.db.insert("transactions", {
      bookId: request.bookId,
      borrowerId: request.borrowerId,
      lenderId: request.lenderId,
      requestId: args.requestId,
      borrowDate: now,
      dueDate,
      status: "active",
    });

    await ctx.db.patch(request.bookId, { status: "lent", updatedAt: now });
    await ctx.db.patch(lender._id, { totalLends: (lender.totalLends ?? 0) + 1, updatedAt: now });

    const borrower = await ctx.db.get(request.borrowerId);
    if (borrower) {
      await ctx.db.patch(borrower._id, { totalBorrows: (borrower.totalBorrows ?? 0) + 1, updatedAt: now });
    }

    const book = await ctx.db.get(request.bookId);
    return { success: true, transactionId, book, borrower, dueDate };
  },
});

export const rejectRequest = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    telegramId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { success: false, message: "Request not found" };

    const lender = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!lender || lender._id !== request.lenderId) return { success: false, message: "Unauthorized" };

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      respondedAt: Date.now(),
      rejectionReason: args.reason,
    });
    await ctx.db.patch(request.bookId, { status: "available", updatedAt: Date.now() });

    const borrower = await ctx.db.get(request.borrowerId);
    const book = await ctx.db.get(request.bookId);
    return { success: true, borrower, book, reason: args.reason };
  },
});

export const returnBook = mutation({
  args: {
    transactionId: v.id("transactions"),
    telegramId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) return { success: false, message: "Transaction not found" };

    const borrower = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!borrower || borrower._id !== transaction.borrowerId) return { success: false, message: "Unauthorized" };

    const now = Date.now();
    await ctx.db.patch(args.transactionId, { status: "returned", returnDate: now });
    await ctx.db.patch(transaction.bookId, { status: "available", updatedAt: now });

    const book = await ctx.db.get(transaction.bookId);
    const lender = await ctx.db.get(transaction.lenderId);
    return { success: true, book, lender };
  },
});

export const getMyRequests = query({
  args: { telegramId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!user) return [];

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_lender", (q) => q.eq("lenderId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return Promise.all(
      requests.map(async (req) => {
        const book = await ctx.db.get(req.bookId);
        const borrower = await ctx.db.get(req.borrowerId);
        return { ...req, book, borrower };
      })
    );
  },
});

export const getMyLoans = query({
  args: { telegramId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .first();
    if (!user) return [];

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return Promise.all(
      transactions.map(async (tx) => {
        const book = await ctx.db.get(tx.bookId);
        const lender = await ctx.db.get(tx.lenderId);
        return { ...tx, book, lender };
      })
    );
  },
});
