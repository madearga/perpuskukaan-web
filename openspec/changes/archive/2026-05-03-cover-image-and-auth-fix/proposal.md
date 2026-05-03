## Why

Perpuskukaan web UI has three blocking issues:
1. **No sign out button** — users cannot log out once authenticated
2. **No cover images** — books display without visual identity, reducing discoverability
3. **No image upload** — neither web nor Telegram bot can attach cover photos to books

The Telegram bot (`@Perpuskukaanbot`) already handles book management via OpenClaw, but cover images are completely absent. Users need to see what a book looks like before borrowing.

## What Changes

- **Uncomment sign out button** in `(auth)/layout.tsx` sidebar — restore `authClient.signOut()` with redirect to `/sign-in`
- **Auto-fetch cover via ISBN** — when user inputs ISBN in add/edit book form, lookup Open Library API (`covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`) and pre-fill cover URL
- **Cover upload via web** — add file input to book form, browser-side resize to 400×600 WebP (~60KB) via Canvas API, upload to Convex Storage via `storage.store()`
- **Cover via Telegram bot** — when user sends photo with `/addbook` command, OpenClaw bot downloads from Telegram (1-hour temp URL), uploads to Convex Storage, attaches `coverStorageId` to book record
- **Compress all uploads** — browser Canvas API (web) or accept Telegram-compressed photo (bot). Target: max 400×600px, WebP 0.7 quality, ~60KB per cover. At this size, 1GB Convex free tier holds 16,000+ books

## Capabilities

### New Capabilities
- `cover-image`: ISBN auto-lookup, web upload with auto-compression, Telegram bot upload, display in catalog cards and detail pages
- `sign-out`: Authenticated users can sign out from sidebar

### Modified Capabilities
- `book-catalog`: Book cards show cover image thumbnails; detail page shows full cover
- `book-borrowing`: Borrow request shows book cover for visual confirmation

## Impact

- **Convex Storage**: ~60KB per cover image. 1000 books = ~60MB, well within 1GB free tier
- **Dependencies**: No new npm packages — Canvas API is native browser, Convex Storage is built-in
- **Schema**: Add optional `coverStorageId` field to `books` table (storageId reference)
- **Bot**: OpenClaw bot needs photo handling in `/addbook` flow (download → Convex upload)
- **OpenSpec**: Archive `perpuskukaan-web-ui` is outdated — this change reflects current reality
