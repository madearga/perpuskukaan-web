## ADDED Requirements

### Requirement: Admin dashboard overview
Users with `role = "admin"` SHALL see a dashboard at `/admin` with key metrics.

#### Scenario: View admin dashboard
- **WHEN** an admin navigates to `/admin`
- **THEN** the system displays stat cards: total users, total books, books available, books lent, active transactions, overdue transactions, pending borrow requests

### Requirement: Admin books management
Admin SHALL be able to view and manage all books at `/admin/books`.

#### Scenario: List all books
- **WHEN** admin navigates to `/admin/books`
- **THEN** the system displays a table of all books with columns: title, author, owner, category, status, created date, with sorting and pagination

#### Scenario: Update book status
- **WHEN** admin changes a book's status via dropdown
- **THEN** the system updates the `books.status` field

### Requirement: Admin users management
Admin SHALL be able to view all users at `/admin/users`.

#### Scenario: List all users
- **WHEN** admin navigates to `/admin/users`
- **THEN** the system displays a table with: name, email/telegramId, reputation, total books shared, total borrows, join date

#### Scenario: View user detail
- **WHEN** admin clicks a user row
- **THEN** the system shows user profile, their books, and transaction history

### Requirement: Admin transactions management
Admin SHALL be able to monitor all transactions at `/admin/transactions`.

#### Scenario: List all transactions
- **WHEN** admin navigates to `/admin/transactions`
- **THEN** the system displays a table: book title, borrower, lender, borrow date, due date, return date, status, with filters for active/returned/overdue

#### Scenario: Overdue highlight
- **WHEN** a transaction has `status = "active"` and `dueDate < now`
- **THEN** the row is highlighted in red with "TERLAMBAT" badge

#### Scenario: Lender marks as returned
- **WHEN** the lender clicks "Tandai Dikembalikan" on an active transaction they own
- **THEN** the system sets `transactions.returnDate = now`, `transactions.status = "returned"`, `books.status = "available"`

#### Scenario: Admin requests return confirmation
- **WHEN** admin clicks "Minta Konfirmasi Pengembalian" on an active transaction
- **THEN** the system notifies the lender via their preferred channel (web notification) to confirm the book was received back

#### Scenario: Admin force-return with audit log
- **WHEN** admin clicks "Force Return" on an overdue transaction (>30 days) and confirms
- **THEN** the system sets `transactions.returnDate = now`, `transactions.status = "returned"`, `books.status = "available"`, and logs the admin action with timestamp and reason

### Requirement: Admin access control
Non-admin users SHALL NOT access admin routes.

#### Scenario: Non-admin access attempt
- **WHEN** a user with `role != "admin"` navigates to `/admin/*`
- **THEN** the system redirects to `/dashboard` with a "Akses ditolak" toast
