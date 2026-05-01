import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    bookId: v.id("books"),
    borrowerId: v.id("users"),
    message: v.optional(v.string()),
    durationDays: v.number(),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return { success: false, error: "Book not found" };
    if (book.status !== "available") {
      return { success: false, error: "Book is not available" };
    }
    if (book.ownerId === args.borrowerId) {
      return { success: false, error: "Cannot borrow your own book" };
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("borrowRequests", {
      bookId: args.bookId,
      borrowerId: args.borrowerId,
      lenderId: book.ownerId,
      message: args.message,
      durationDays: args.durationDays,
      status: "pending",
      source: "web",
      createdAt: now,
      respondedAt: undefined,
      rejectionReason: undefined,
    });

    return { success: true, requestId };
  },
});

export const getByBorrower = query({
  args: { borrowerId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", args.borrowerId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      requests.map(async (req) => {
        const book = await ctx.db.get(req.bookId);
        const lender = await ctx.db.get(req.lenderId);
        return { ...req, book, lender };
      })
    );

    return enriched;
  },
});

export const getByLender = query({
  args: { lenderId: v.id("users") },
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_lender", (q) => q.eq("lenderId", args.lenderId))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      requests.map(async (req) => {
        const book = await ctx.db.get(req.bookId);
        const borrower = await ctx.db.get(req.borrowerId);
        return { ...req, book, borrower };
      })
    );

    return enriched;
  },
});

export const accept = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "pending") {
      return { success: false, error: "Request is not pending" };
    }

    const now = Date.now();
    const dueDate = now + request.durationDays * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.requestId, {
      status: "accepted",
      respondedAt: now,
    });

    await ctx.db.insert("transactions", {
      bookId: request.bookId,
      borrowerId: request.borrowerId,
      lenderId: request.lenderId,
      requestId: args.requestId,
      borrowDate: now,
      dueDate,
      status: "active",
    });

    await ctx.db.patch(request.bookId, {
      status: "lent",
      updatedAt: now,
    });

    return { success: true };
  },
});

export const reject = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return { success: false, error: "Request not found" };
    if (request.status !== "pending") {
      return { success: false, error: "Request is not pending" };
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      respondedAt: Date.now(),
      rejectionReason: args.reason,
    });

    return { success: true };
  },
});
