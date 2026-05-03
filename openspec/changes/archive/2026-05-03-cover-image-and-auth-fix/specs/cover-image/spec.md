## ADDED Requirements

### Requirement: Sign out functionality
The system SHALL provide a sign out button in the authenticated layout sidebar that calls `authClient.signOut()` and redirects the user to `/sign-in`.

#### Scenario: User signs out
- **WHEN** user clicks "Keluar" button in sidebar
- **THEN** the system calls `authClient.signOut()`, clears the session, and redirects to `/sign-in`

#### Scenario: User on sign-in page after sign out
- **WHEN** user arrives at `/sign-in` after signing out
- **THEN** no cached session remains; user must authenticate again

### Requirement: Cover image display in catalog
The system SHALL display cover images on book catalog cards and book detail pages. Display priority: uploaded cover (`coverStorageId`) > URL cover (`coverImage`) > placeholder.

#### Scenario: Book with uploaded cover
- **WHEN** a book has `coverStorageId` set
- **THEN** the system displays the image from Convex Storage via `storage.getUrl()`

#### Scenario: Book with URL cover
- **WHEN** a book has `coverImage` URL set but no `coverStorageId`
- **THEN** the system displays the external URL image

#### Scenario: Book without cover
- **WHEN** a book has neither `coverStorageId` nor `coverImage`
- **THEN** the system displays a placeholder with book icon

#### Scenario: Cover in catalog grid
- **WHEN** catalog page renders book cards
- **THEN** each card shows the cover thumbnail (aspect ratio 2:3) at the top

#### Scenario: Cover in detail page
- **WHEN** book detail page renders
- **THEN** the cover image displays at full width (max 400px) above book info

### Requirement: ISBN auto-lookup for cover images
The system SHALL auto-fetch cover images from Open Library API when a valid ISBN is provided during book creation or editing.

#### Scenario: ISBN found on Open Library
- **WHEN** user enters a valid ISBN in the book form
- **THEN** the system queries `https://covers.openlibrary.org/b/isbn/{ISBN}-M.jpg`
- **AND** if found, pre-fills the `coverImage` field with the URL
- **AND** shows a preview of the cover

#### Scenario: ISBN not found on Open Library
- **WHEN** Open Library returns 404 for the ISBN
- **THEN** the system tries Google Books API as fallback
- **AND** if still not found, shows "Cover tidak ditemukan untuk ISBN ini"

#### Scenario: Auto-lookup does not block form
- **WHEN** ISBN lookup is in progress
- **THEN** the form remains interactive; lookup runs in background

### Requirement: Cover image upload via web
The system SHALL allow authenticated users to upload cover images when adding or editing books. Images are auto-compressed before upload.

#### Scenario: Upload cover image
- **WHEN** user selects an image file in the book form
- **THEN** the system resizes the image to max 400×600px using Canvas API
- **AND** converts to WebP format at 0.7 quality
- **AND** uploads the compressed blob to Convex Storage
- **AND** sets `coverStorageId` on the book record

#### Scenario: Large image compression
- **WHEN** user uploads a 5MB photo from their phone camera
- **THEN** the system compresses to ~60KB WebP before uploading
- **AND** upload completes in under 2 seconds on broadband

#### Scenario: Invalid file type
- **WHEN** user selects a non-image file (PDF, video, etc.)
- **THEN** the system shows error "Format file tidak didukung. Gunakan JPG, PNG, atau WebP"

#### Scenario: Replace existing cover
- **WHEN** user uploads a new cover for a book that already has one
- **THEN** the system replaces the old cover with the new one
- **AND** deletes the old file from Convex Storage to prevent orphaned files

### Requirement: Cover image from Telegram bot
The system SHALL accept cover images sent via the Telegram bot and store them in Convex Storage.

#### Scenario: User sends photo with /addbook command
- **WHEN** Telegram user sends a photo along with `/addbook` command
- **THEN** the bot downloads the photo from Telegram servers
- **AND** uploads the photo bytes to Convex Storage via `books.uploadCover` action
- **AND** creates the book record with `coverStorageId` set to the stored file ID

#### Scenario: User sends photo without command
- **WHEN** Telegram user sends a photo without a command
- **THEN** the bot ignores the photo or asks "Tambahkan sebagai cover buku? Kirim /addbook dengan foto"

### Requirement: Cover image compression specifications
All uploaded cover images SHALL meet these specifications:

| Property | Target |
|---|---|
| Max width | 400px |
| Max height | 600px |
| Aspect ratio | 2:3 (portrait) |
| Format | WebP (fallback: JPEG) |
| Quality | 0.7 (WebP) / 0.8 (JPEG) |
| Target size | ~60KB |
| Max upload input | 20MB |
