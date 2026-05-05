import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const SHARED_SECRET = process.env.OPENCLAW_PUBLIC_SECRET!;

const ALLOWED_ACTIONS = [
  "register",
  "search_books",
  "my_books",
  "add_book_draft",
  "borrow_draft",
  "my_borrows",
  "incoming_borrow_requests",
  "approve_borrow",
  "reject_borrow",
  "return_book",
] as const;

type AllowedAction = (typeof ALLOWED_ACTIONS)[number];

const handlers: Record<AllowedAction, (body: Record<string, unknown>) => Promise<unknown>> = {
  register: async (body) =>
    client.mutation(api.publicAgent.registerTelegramUser, {
      providerUserId: body.providerUserId as string,
      username: body.username as string | undefined,
      displayName: body.displayName as string | undefined,
    }),
  search_books: async (body) =>
    client.query(api.publicAgent.searchBooks, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      query: body.query as string,
    }),
  my_books: async (body) =>
    client.query(api.publicAgent.getMyBooks, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
    }),
  add_book_draft: async (body) =>
    client.mutation(api.publicAgent.createBookDraft, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      idempotencyKey: body.idempotencyKey as string,
      title: body.title as string,
      author: body.author as string,
      category: body.category as string,
      condition: body.condition as string,
      mode: body.mode as string,
    }),
  borrow_draft: async (body) =>
    client.mutation(api.publicAgent.createBorrowDraft, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      idempotencyKey: body.idempotencyKey as string,
      bookId: body.bookId as any,
      durationDays: body.durationDays as number,
    }),
  my_borrows: async (body) =>
    client.query(api.publicAgent.getMyBorrows, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
    }),
  incoming_borrow_requests: async (body) =>
    client.query(api.publicAgent.getIncomingBorrowRequests, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
    }),
  approve_borrow: async (body) =>
    client.mutation(api.publicAgent.approveBorrow, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      idempotencyKey: body.idempotencyKey as string,
      requestId: body.requestId as any,
    }),
  reject_borrow: async (body) =>
    client.mutation(api.publicAgent.rejectBorrow, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      idempotencyKey: body.idempotencyKey as string,
      requestId: body.requestId as any,
      rejectionReason: body.rejectionReason as string | undefined,
    }),
  return_book: async (body) =>
    client.mutation(api.publicAgent.returnBook, {
      channel: "telegram",
      providerUserId: body.providerUserId as string,
      idempotencyKey: body.idempotencyKey as string,
      transactionId: body.transactionId as any,
    }),
};

export async function POST(request: Request) {
  const secret = request.headers.get("X-OpenClaw-Secret");
  if (!SHARED_SECRET || secret !== SHARED_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const action = body?.action as string | undefined;

  if (!action || !ALLOWED_ACTIONS.includes(action as AllowedAction) || !body) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const result = await handlers[action as AllowedAction](body);
  return NextResponse.json({ ok: true, action, result });
}
