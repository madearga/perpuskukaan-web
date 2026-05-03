## Context

Perpuskukaan has 6 tables in Convex (`watchful-rook-105`) shared between Telegram bot (OpenClaw) and web UI (Next.js 16). Currently zero books in database — bot and web need cover image support from the start.

The `books` table already has `coverImage: v.optional(v.string())` field (URL string). We extend this with `coverStorageId` for Convex Storage references.

## Goals / Non-Goals

**Goals:**
- Users can sign out from the web UI
- Book catalog shows cover images on cards and detail pages
- Web users can upload cover images when adding/editing books
- Bot users can send photos as book covers via Telegram
- All uploaded images auto-compressed to ~60KB WebP
- ISBN auto-lookup provides covers for common books (no upload needed)

**Non-Goals:**
- PDF/document storage via Telegram Drive (Phase 2)
- Image editing/cropping UI (use browser resize only)
- Bulk image upload
- AI-generated book covers

## Decisions

### D1: Convex Storage as primary image store
Store all uploaded covers in Convex Storage (`storage.store()`). URL-based covers (ISBN lookup, manual URL) stored as string in `coverImage`. Uploaded covers stored as `coverStorageId` (Convex storage ID).

**Why not Telegram Storage?** Telegram `getFile` URLs expire after 1 hour — needs proxy refresh on every image load. Convex Storage gives permanent URLs natively. At ~60KB per cover, free tier handles 16,000+ books. Telegram Storage reserved for Phase 2 (large files, PDFs).

### D2: Browser-side compression via Canvas API
Resize + convert to WebP in the browser before upload. No npm dependencies needed.

```
Flow: File input → FileReader → Image → Canvas (400×600) → toBlob('webp', 0.7) → upload
Result: 5MB photo → ~60KB WebP
```

### D3: Dual cover field strategy
- `coverImage: v.optional(v.string())` — for URL-based covers (ISBN lookup, manual URL paste)
- `coverStorageId: v.optional(v.string())` — for uploaded covers (Convex storage ID)

Display priority: `coverStorageId` (uploaded) > `coverImage` (URL) > placeholder

### D4: ISBN lookup via Open Library
Open Library covers API — no API key, no rate limit concerns for this use case:
```
GET https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg
→ 302 redirect to cover image, or 404 if not found
```

Google Books API as fallback (1000 req/day free):
```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:{ISBN}
→ items[0].volumeInfo.imageLinks.thumbnail
```

### D5: Bot cover handling
When user sends photo with book command:
1. OpenClaw bot receives `message.photo` (array of sizes)
2. Bot picks largest size, gets `file_id`
3. Bot calls Telegram `getFile` API → gets temp download URL
4. Bot downloads image bytes
5. Bot calls Convex action `books.uploadCover` with image bytes
6. Convex stores via `storage.store()`, returns `storageId`
7. Bot saves `coverStorageId` on the book record

Telegram auto-compresses photos sent as `photo` type (not `document`), so we get reasonable quality already. No server-side compression needed for bot flow.

### D6: Sign out implementation
Uncomment existing code in `(auth)/layout.tsx`. Use `authClient.signOut()` with `fetchOptions: { onSuccess: () => window.location.href = '/sign-in' }` for clean redirect after logout.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Convex Storage exceeds 1GB free tier | At 60KB/book, need 16,000+ books. Unlikely in MVP. Monitor usage. |
| Open Library has no Indonesian book covers | Fall back to Google Books API. User can always upload manually. |
| WebP not supported in old browsers | 97% support (2026). Fallback: serve JPEG via canvas `toBlob('jpeg', 0.8)`. |
| Bot can't reach Convex Storage API | Convex actions accept file uploads via multipart. Bot sends bytes directly. |
| Telegram file URL expires before bot downloads | Bot must download within 1 hour. OpenClaw processes messages immediately. |
