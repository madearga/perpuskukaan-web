## ADDED Requirements

### Requirement: Public book catalog listing
The system SHALL display all books in a grid layout with cover image, title, author, category, language, and status badges. The catalog SHALL be accessible without authentication.

#### Scenario: Browse all books
- **WHEN** a visitor navigates to `/catalog`
- **THEN** the system displays all books in a paginated grid (24 per page), sorted by creation date (newest first)

#### Scenario: Empty catalog
- **WHEN** no books exist in the database
- **THEN** the system displays an empty state message "Belum ada buku. Jadilah yang pertama berbagi!"

### Requirement: Book search
The system SHALL provide a search bar that uses Convex full-text search on book titles.

#### Scenario: Search by title or author
- **WHEN** a user types "Laskar Pelangi" in the search bar
- **THEN** the system displays books whose **title OR author** matches "Laskar Pelangi", ranked by relevance

#### Scenario: No results
- **WHEN** a search returns zero results
- **THEN** the system displays "Tidak ada buku yang ditemukan untuk '<query>'"

### Requirement: Book filtering
The system SHALL provide filter controls for category, language, fiction type, and availability status.

#### Scenario: Filter by category
- **WHEN** a user selects category "Filsafat"
- **THEN** the system displays only books with `category = "Filsafat"` that are `status = "available"`

#### Scenario: Combined filters
- **WHEN** a user selects language "Indonesia" AND fiction type "fiksi"
- **THEN** the system displays books matching both filters simultaneously

#### Scenario: Clear filters
- **WHEN** a user clicks "Reset Filter"
- **THEN** all filters are cleared and the full catalog is shown

### Requirement: Book detail page
The system SHALL display a dedicated detail page for each book at `/catalog/[id]`.

#### Scenario: View book detail
- **WHEN** a visitor clicks a book card or navigates to `/catalog/<bookId>`
- **THEN** the system displays: title, author, ISBN, description, category, condition, language, fiction type, cover image, status badge, owner name + reputation, and all reviews

#### Scenario: Book not found
- **WHEN** a visitor navigates to `/catalog/<invalid-id>`
- **THEN** the system displays a 404 message "Buku tidak ditemukan"

### Requirement: Responsive catalog layout
The system SHALL display the catalog in a responsive grid: 1 column on mobile, 2 on tablet, 3-4 on desktop.

#### Scenario: Mobile view
- **WHEN** the viewport is below 640px wide
- **THEN** books display in a single-column list with compact cards
