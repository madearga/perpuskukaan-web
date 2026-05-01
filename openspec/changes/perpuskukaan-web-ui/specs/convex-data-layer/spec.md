## ADDED Requirements

### Requirement: Merged Convex schema
The system SHALL use a single Convex schema that supports both Better Auth (web) and Telegram (bot) user identities, plus all Perpuskukaan data tables. Schema changes are **additive only** — new optional fields and new tables, never modifying existing required fields.

#### Scenario: Schema deployment
- **WHEN** the schema is pushed to Convex deployment `prod:watchful-rook-105`
- **THEN** all new optional fields are added to existing `users` table, new tables are created with indexes, and existing bot data remains intact

#### Scenario: Better Auth compatibility
- **WHEN** a new user registers via Better Auth
- **THEN** the `users` record is created with `email` (required, from Better Auth), `role = "user"`, `telegramId = null`, and default stats

#### Scenario: Telegram bot compatibility
- **WHEN** the Telegram bot creates a user via existing `users.insert`
- **THEN** the record is created with `telegramId` (required for bot), `email = "telegram-{telegramId}@perpuskukaan.local"` (placeholder), `role = "user"`, and default stats

### Requirement: Book queries
The data layer SHALL provide queries for catalog browsing and detail views.

#### Scenario: Paginated book list
- **WHEN** `books.list` is called with `{ page: 1, pageSize: 24, filters?: { category, language, fictionType, status } }`
- **THEN** the system returns 24 books matching filters with total count for pagination

#### Scenario: Book search by title or author
- **WHEN** `books.search` is called with `{ query: "Laskar", category?: string, limit?: number }`
- **THEN** the system returns books matching the search term in **title OR author** via Convex search index, filtered by status "available"

#### Scenario: Book detail with owner
- **WHEN** `books.getById` is called with `{ bookId }`
- **THEN** the system returns the book record enriched with owner profile (name, reputation)

#### Scenario: Book stats
- **WHEN** `books.getStats` is called
- **THEN** the system returns `{ total, available, lent, reserved, byCategory: Record<string, number> }`

### Requirement: User queries
The data layer SHALL provide queries for user profiles and management.

#### Scenario: Get user profile
- **WHEN** `users.getProfile` is called with `{ userId }`
- **THEN** the system returns user record with computed stats (total books, borrows, lends, reputation)

#### Scenario: Update profile
- **WHEN** `users.updateProfile` is called with `{ bio?, phone?, location?, avatar? }`
- **THEN** the system updates only the provided fields and `updatedAt`

#### Scenario: Ensure user exists
- **WHEN** a Better Auth user logs in for the first time
- **THEN** the system creates a `users` record with `email` from auth, `role = "user"`, default stats, and timestamps

### Requirement: Borrow request mutations
The data layer SHALL provide mutations for creating and responding to borrow requests.

#### Scenario: Create borrow request
- **WHEN** `borrowRequests.create` is called with `{ bookId, borrowerId, message?, durationDays }`
- **THEN** the system creates a request with `status = "pending"`, `source = "web"`, resolves `lenderId` from the book's `ownerId`

#### Scenario: Accept borrow request
- **WHEN** `borrowRequests.accept` is called with `{ requestId }`
- **THEN** the system updates request status to "accepted", creates a transaction, updates book status to "lent"

#### Scenario: Reject borrow request
- **WHEN** `borrowRequests.reject` is called with `{ requestId, reason? }`
- **THEN** the system updates request status to "rejected" with optional reason

### Requirement: Transaction queries
The data layer SHALL provide queries for active and historical transactions.

#### Scenario: Active transactions for user
- **WHEN** `transactions.getActive` is called with `{ userId }`
- **THEN** the system returns all transactions where user is borrower or lender AND `status = "active"`, enriched with book and counterparty info

#### Scenario: Overdue transactions
- **WHEN** `transactions.getOverdue` is called
- **THEN** the system returns all transactions where `status = "active"` AND `dueDate < Date.now()`

#### Scenario: All transactions (admin)
- **WHEN** `transactions.getAll` is called with `{ page, pageSize, status? }`
- **THEN** the system returns paginated transactions with book, borrower, and lender info

### Requirement: Review queries
The data layer SHALL provide queries and mutations for book reviews.

#### Scenario: Reviews by book
- **WHEN** `reviews.getByBook` is called with `{ bookId }`
- **THEN** the system returns all reviews for that book with reviewer info and rating

### Requirement: Wishlist queries
The data layer SHALL provide queries and mutations for wishlist management.

#### Scenario: Get user wishlist
- **WHEN** `wishlist.getByUser` is called with `{ userId }`
- **THEN** the system returns all wishlisted books with their current status

#### Scenario: Add to wishlist
- **WHEN** `wishlist.add` is called with `{ userId, bookId }`
- **THEN** the system creates a `wishlist` record with unique index on `(userId, bookId)`

#### Scenario: Remove from wishlist
- **WHEN** `wishlist.remove` is called with `{ userId, bookId }`
- **THEN** the system deletes the matching `wishlist` record

#### Scenario: Idempotent wishlist add
- **WHEN** `wishlist.add` is called with a `(userId, bookId)` pair that already exists
- **THEN** the unique index constraint prevents duplicate, mutation returns existing record without error
