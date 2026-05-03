## Tasks

### Phase 1: Auth Fix (15 min)
- [x] T1: Uncomment sign out button in `(auth)/layout.tsx` — restore `authClient` import, uncomment `<button onClick={() => authClient.signOut()}>`, add redirect to `/sign-in`
- [x] T2: Test sign out flow end-to-end — verify session clears, redirect works, user can sign in again

### Phase 2: Cover Display (30 min)
- [x] T3: Add cover image display to catalog card component — show `<img>` with `coverStorageId` priority over `coverImage`, fallback placeholder
- [x] T4: Add cover image to book detail page — full-width cover (max 400px) above book info
- [x] T5: Add `coverStorageId` field to `books` schema — `v.optional(v.string())`, add to `books.add` mutation args

### Phase 3: ISBN Auto-Lookup (30 min)
- [x] T6: Create `books.lookupISBN` Convex action — fetch Open Library API, fallback to Google Books API, return cover URL
- [ ] T7: Add ISBN lookup to book add/edit form — debounce input, show preview, pre-fill `coverImage` field
- [ ] T8: Test with Indonesian book ISBNs — verify Laskar Pelangi, Bumi Manusia, etc. are found

### Phase 4: Web Upload (1 hour)
- [x] T9: Create `uploadCoverImage` helper — browser Canvas API resize (400×600) + WebP conversion
- [x] T10: Create `books.uploadCover` Convex action — accept File via `httpAction`, store via `storage.store()`, return `storageId`
- [ ] T11: Add file upload input to book add/edit form — drag-and-drop or click, preview compressed result before submit
- [x] T12: Add `books.deleteCover` Convex action — remove old storage file when cover is replaced
- [ ] T13: Test compression pipeline — verify 5MB photo → ~60KB WebP, visual quality acceptable

### Phase 5: Bot Integration (1 hour)
- [ ] T14: Update OpenClaw bot `/addbook` flow — detect `message.photo`, download via Telegram `getFile` API, upload to Convex via `books.uploadCover` action
- [ ] T15: Test bot photo flow — send photo + `/addbook` via Telegram, verify cover appears in web catalog
- [ ] T16: Update OpenClaw to v2026.5.2 (after backup) — may improve file handling capabilities
