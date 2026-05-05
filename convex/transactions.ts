import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getActive = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const asBorrower = await ctx.db
      .query("transactions")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const asLender = await ctx.db
      .query("transactions")
      .withIndex("by_lender", (q) => q.eq("lenderId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const all = [...asBorrower, ...asLender];
    const enriched = await Promise.all(
      all.map(async (t) => {
        const book = await ctx.db.get(t.bookId);
        const borrower = await ctx.db.get(t.borrowerId);
        const lender = await ctx.db.get(t.lenderId);
        if ((borrower && borrower.isActive === false) || (lender && lender.isActive === false)) return null;
        return { ...t, book, borrower, lender };
      })
    );

    return enriched.filter((t) => t !== null);
  },
});

export const getOverdue = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const all = await ctx.db
      .query("transactions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const overdue = all.filter((t) => t.dueDate < now);

    const enriched = await Promise.all(
      overdue.map(async (t) => {
        const book = await ctx.db.get(t.bookId);
        const borrower = await ctx.db.get(t.borrowerId);
        const lender = await ctx.db.get(t.lenderId);
        if ((borrower && borrower.isActive === false) || (lender && lender.isActive === false)) return null;
        return {
          ...t,
          book,
          borrower,
          lender,
          daysOverdue: Math.ceil((now - t.dueDate) / dayMs),
        };
      })
    );

    return enriched.filter((t) => t !== null);
  },
});

export const getAll = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let transactions;
    if (args.status) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_status", (q) => q.eq("status", args.status as string))
        .order("desc")
        .collect();
    } else {
      transactions = await ctx.db.query("transactions").order("desc").collect();
    }

    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const book = await ctx.db.get(t.bookId);
        const borrower = await ctx.db.get(t.borrowerId);
        const lender = await ctx.db.get(t.lenderId);
        if ((borrower && borrower.isActive === false) || (lender && lender.isActive === false)) return null;
        return { ...t, book, borrower, lender };
      })
    );

    return enriched.filter((t) => t !== null);
  },
});

export const markReturned = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) return { success: false, error: "Transaction not found" };
    if (transaction.status !== "active") {
      return { success: false, error: "Transaction is not active" };
    }

    const now = Date.now();

    await ctx.db.patch(args.transactionId, {
      status: "returned",
      returnDate: now,
    });

    await ctx.db.patch(transaction.bookId, {
      status: "available",
      updatedAt: now,
    });

    return { success: true };
  },
});
