## ADDED Requirements

### Requirement: Borrow request from web
Authenticated users SHALL be able to submit a borrow request for any book with `status = "available"`.

#### Scenario: Submit borrow request
- **WHEN** an authenticated user clicks "Pinjam Buku" on a book detail page and submits the form with message and duration
- **THEN** the system creates a `borrowRequests` record with `status = "pending"`, `source = "web"`, and the current user as `borrowerId`

#### Scenario: Book not available
- **WHEN** a user views a book with `status = "lent"` or `status = "reserved"`
- **THEN** the "Pinjam Buku" button is disabled and shows "Sedang dipinjam"

#### Scenario: Borrow own book
- **WHEN** a user tries to borrow a book they own (`ownerId = current user`)
- **THEN** the system shows "Ini buku Anda sendiri" and disables the borrow button

### Requirement: Borrow request form
The system SHALL present a form with message (optional, textarea) and duration in days (required, number input, min 1, max 90).

#### Scenario: Valid submission
- **WHEN** user fills duration "14" days and message "Mohon pinjam untuk baca liburan"
- **THEN** the system creates the request and redirects to "My Borrows" page with success toast

#### Scenario: Missing duration
- **WHEN** user submits without entering duration
- **THEN** the system shows validation error "Durasi pinjam wajib diisi"

### Requirement: View my borrow requests
Authenticated users SHALL see a list of their borrow requests with status badges (pending/accepted/rejected/cancelled).

#### Scenario: View all my requests
- **WHEN** user navigates to `/my-borrows`
- **THEN** the system displays all `borrowRequests` where `borrowerId = current user`, grouped by status, newest first

#### Scenario: Active borrows tab
- **WHEN** user clicks "Sedang Dipinjam" tab on `/my-borrows`
- **THEN** the system displays active `transactions` where `borrowerId = current user` and `status = "active"`, showing book title, lender, due date

### Requirement: View incoming requests (as lender)
Authenticated users who own books SHALL see incoming borrow requests for their books.

#### Scenario: Incoming requests list
- **WHEN** user navigates to "Permintaan Masuk" section
- **THEN** the system displays all `borrowRequests` where `lenderId = current user` and `status = "pending"`

#### Scenario: Accept request
- **WHEN** lender clicks "Terima" on a pending request
- **THEN** the system updates `borrowRequests.status = "accepted"`, creates a `transactions` record with `status = "active"`, and updates `books.status = "lent"`

#### Scenario: Reject request
- **WHEN** lender clicks "Tolak" and optionally enters a reason
- **THEN** the system updates `borrowRequests.status = "rejected"` with the reason
