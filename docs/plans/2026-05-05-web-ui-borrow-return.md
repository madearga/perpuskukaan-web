# Web UI Borrow & Return Coverage Plan

> Quick plan to cover missing web UI actions for Telegram command parity.

**Goal:** Web /my-borrows page covers `/pinjam`, `/kembali`, `/drop` so every Telegram command has a web equivalent.

---

## Task: Add borrow form, return button, and drop info to web UI

**Files:**
- Modify: `src/app/(auth)/my-borrows/page.tsx`
- Create: `src/app/(auth)/drop-info/page.tsx`
- Modify: `src/app/(auth)/layout.tsx` (add nav link)
- Test: `tests/auth-surface.test.mjs` (extend)

### Steps

- [ ] **Step 1: Add "Ajukan Pinjaman" form at top of /my-borrows**
  - Simple form: pilih buku (dropdown/search), durasi hari
  - Call `api.borrowRequests.create` or pass through publicAgent route

- [ ] **Step 2: Add "Kembalikan" button on active borrows**
  - Button on each active borrow card
  - Call `api.borrowRequests.return` or `api.transactions.return`

- [ ] **Step 3: Add /drop-info page**
  - Static page with drop point locations and info

- [ ] **Step 4: Add nav link to drop-info in authenticated layout**

- [ ] **Step 5: Tests + build + commit**
