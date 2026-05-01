## ADDED Requirements

### Requirement: User registration via email
The system SHALL allow new users to register with email and password via Better Auth.

#### Scenario: Successful registration
- **WHEN** a visitor submits valid email and password (min 8 chars) on `/sign-up`
- **THEN** the system creates a Better Auth account and a `users` record with `email` (required), `telegramId = null`, `role = "user"`, `linkedUserIds = []`, default stats (0), and timestamps

#### Scenario: Admin seed on first registration
- **WHEN** the first user registers with email matching `ADMIN_EMAIL` env var
- **THEN** the system creates the user with `role = "admin"` instead of `"user"`

#### Scenario: Duplicate email
- **WHEN** a visitor registers with an email that already exists
- **THEN** the system shows "Email sudah terdaftar"

### Requirement: User login
The system SHALL allow registered users to log in with email and password.

#### Scenario: Successful login
- **WHEN** a user submits correct credentials on `/sign-in`
- **THEN** the system authenticates the user and redirects to `/dashboard`

#### Scenario: Wrong password
- **WHEN** a user submits incorrect password
- **THEN** the system shows "Email atau password salah"

### Requirement: User profile page
Authenticated users SHALL have a profile page at `/profile` showing their info and stats.

#### Scenario: View profile
- **WHEN** user navigates to `/profile`
- **THEN** the system displays: name, email, avatar, bio, phone, location, reputation score, total books shared, total borrows, total lends

#### Scenario: Edit profile
- **WHEN** user updates bio, phone, location, or avatar URL and clicks "Simpan"
- **THEN** the system updates the `users` record and shows a success toast

#### Scenario: Link Telegram account (Phase 2 prep)
- **WHEN** user enters their Telegram username in profile settings
- **THEN** the system searches for a `users` record with matching `telegramId` and stores the linked ID in `linkedUserIds` array

### Requirement: My books page
Authenticated users SHALL see all books they own at `/my-books`.

#### Scenario: View my books
- **WHEN** user navigates to `/my-books`
- **THEN** the system displays all `books` where `ownerId = current user`, with status badges (available/lent/reserved)

#### Scenario: Add book from web
- **WHEN** user clicks "Tambah Buku" and fills the form (title, author, category, condition, language, fiction type)
- **THEN** the system creates a `books` record with `ownerId = current user`, `status = "available"`, `source = "web"`

### Requirement: Wishlist
Authenticated users SHALL be able to add books to a wishlist and view their wishlist.

#### Scenario: Add to wishlist
- **WHEN** user clicks heart icon on a book card or detail page
- **THEN** the system creates a `wishlist` record linking the user and book

#### Scenario: Remove from wishlist
- **WHEN** user clicks the filled heart icon again
- **THEN** the system deletes the `wishlist` record

#### Scenario: View wishlist
- **WHEN** user navigates to `/wishlist`
- **THEN** the system displays all wishlisted books with current status

### Requirement: Auth redirect
Unauthenticated users accessing protected routes SHALL be redirected to sign-in.

#### Scenario: Protected route access
- **WHEN** an unauthenticated visitor navigates to `/dashboard`, `/profile`, `/my-books`, `/my-borrows`, or `/wishlist`
- **THEN** the system redirects to `/sign-in` with a return URL parameter
