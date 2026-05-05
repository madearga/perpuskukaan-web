# Mobile UX Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Perpuskukaan feel excellent on mobile devices by improving navigation, touch targets, catalog discovery, book/borrow flows, and adding a mobile-first chat entry point for the natural-language Bot Layer.

**Architecture:** Keep existing Next.js + Tailwind + Radix/shadcn-style components. Add mobile-specific layout components without rewriting desktop pages. Preserve Convex data flows; UI enhancement only. Prioritize accessibility, touch ergonomics, and responsive performance.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Radix UI, lucide-react, Convex, existing Bot Layer `/api/chat`.

---

## UI/UX Direction

Using `ui-ux-pro-max` design-system guidance for “community library mobile first book catalog borrowing chat”:

- Pattern: **Community/Forum Landing**
- Style: **Exaggerated Minimalism** with bookish/editorial warmth
- Palette direction:
  - Primary: `#7C3AED`
  - Secondary: `#A78BFA`
  - CTA: `#22C55E`
  - Background: `#FAF5FF`
  - Text: `#4C1D95`
- Typography mood: literary/editorial, but keep current font stack unless adding fonts is explicitly approved.

## Mobile UX Principles

- Minimum touch target: `44x44px`
- Body text minimum: `16px`
- No horizontal scroll at `375px`
- Sticky primary actions on detail/action pages
- Bottom navigation for authenticated mobile users
- Search-first catalog on mobile
- Clear loading/empty/error states
- Visible focus rings
- Respect reduced motion

---

## Task 1: Add Mobile UX Static Tests

**Files:**
- Create: `tests/mobile-ux-surface.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `tests/mobile-ux-surface.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("authenticated layout includes mobile bottom navigation", () => {
  const layout = read("src/app/(auth)/layout.tsx");

  assert.match(layout, /MobileBottomNav/);
  assert.match(layout, /md:hidden/);
  assert.match(layout, /min-h-\[44px\]/);
  assert.match(layout, /aria-label="Mobile navigation"/);
});

test("catalog page has mobile-first search and responsive cards", () => {
  const catalog = read("src/app/(unauth)/catalog/page.tsx");

  assert.match(catalog, /sticky/);
  assert.match(catalog, /Search/);
  assert.match(catalog, /grid-cols-1/);
  assert.match(catalog, /sm:grid-cols-2/);
  assert.match(catalog, /min-h-\[44px\]/);
});

test("web chat entry exists and uses bot layer", () => {
  const component = read("src/components/mobile-chat-fab.tsx");

  assert.match(component, /\/api\/chat/);
  assert.match(component, /fixed/);
  assert.match(component, /bottom-/);
  assert.match(component, /aria-label="Buka chat Perpuskukaan"/);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: FAIL because mobile components/markers are missing.

---

## Task 2: Add Mobile Bottom Navigation

**Files:**
- Create: `src/components/mobile-bottom-nav.tsx`
- Modify: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create `src/components/mobile-bottom-nav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Bookmark, Heart, Home, Library, User } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/catalog", label: "Cari", icon: BookOpen },
  { href: "/my-books", label: "Buku", icon: Library },
  { href: "/my-borrows", label: "Pinjam", icon: Bookmark },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profil", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-6 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Wire it into `src/app/(auth)/layout.tsx`**

Add import:

```tsx
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
```

Change root wrapper/main padding:

```tsx
return (
  <div className="flex min-h-[calc(100vh-2rem)] pb-20 md:pb-0">
    ...
    <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
    <MobileBottomNav />
  </div>
);
```

- [ ] **Step 3: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: mobile nav test passes, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/components/mobile-bottom-nav.tsx 'src/app/(auth)/layout.tsx' tests/mobile-ux-surface.test.mjs
git commit -m "feat: add mobile bottom navigation"
```

---

## Task 3: Improve Mobile Catalog Discovery

**Files:**
- Modify: `src/app/(unauth)/catalog/page.tsx`

- [ ] **Step 1: Inspect current catalog structure**

```bash
cd ~/Desktop/perpuskukaan-web
sed -n '1,240p' 'src/app/(unauth)/catalog/page.tsx'
```

Expected: identify search input, grid, cards.

- [ ] **Step 2: Apply mobile-first layout changes**

Implement these exact UX requirements in `src/app/(unauth)/catalog/page.tsx`:

- Search/filter area uses sticky mobile top:

```tsx
<div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
```

- Search input/button touch targets include:

```tsx
className="min-h-[44px]"
```

- Book grid starts mobile single-column:

```tsx
className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
```

- Book cards have comfortable mobile hit targets and no hover-only affordance:

```tsx
className="group rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary"
```

- Empty state includes one clear action:

```tsx
<p className="text-sm text-muted-foreground">Coba kata kunci lain atau tanyakan ke chat Perpuskukaan.</p>
```

- [ ] **Step 3: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: catalog mobile static test passes, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add 'src/app/(unauth)/catalog/page.tsx' tests/mobile-ux-surface.test.mjs
git commit -m "feat: improve mobile catalog discovery"
```

---

## Task 4: Add Mobile Chat Floating Action Button

**Files:**
- Create: `src/components/mobile-chat-fab.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/mobile-chat-fab.tsx`**

```tsx
"use client";

import { useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

export function MobileChatFab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("Ada yang bisa aku bantu cari di Perpuskukaan?");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setReply(data.text ?? "Maaf, aku belum bisa menjawab itu.");
      setText("");
    } catch {
      setReply("Maaf, chat Perpuskukaan sedang bermasalah. Coba lagi sebentar ya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6">
      {open && (
        <div className="mb-3 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border bg-background p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Chat Perpuskukaan</p>
              <p className="text-xs text-muted-foreground">Cari buku dengan bahasa natural.</p>
            </div>
            <button
              aria-label="Tutup chat Perpuskukaan"
              className="min-h-[44px] min-w-[44px] rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setOpen(false)}
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
          <div className="mb-3 rounded-xl bg-muted p-3 text-sm">{reply}</div>
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
              placeholder="Contoh: cari buku parenting"
              className="min-h-[44px] min-w-0 flex-1 rounded-xl border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              aria-label="Kirim chat Perpuskukaan"
              disabled={loading}
              onClick={() => void send()}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-primary text-primary-foreground disabled:opacity-60"
            >
              <Send className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button
        aria-label="Buka chat Perpuskukaan"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Add to `src/app/layout.tsx`**

Import:

```tsx
import { MobileChatFab } from "@/components/mobile-chat-fab";
```

Render before closing body:

```tsx
<MobileChatFab />
```

- [ ] **Step 3: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: chat FAB test passes, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add src/components/mobile-chat-fab.tsx src/app/layout.tsx tests/mobile-ux-surface.test.mjs
git commit -m "feat: add mobile natural language chat entry"
```

---

## Task 5: Polish Mobile Authenticated Pages

**Files:**
- Modify: `src/app/(auth)/dashboard/page.tsx`
- Modify: `src/app/(auth)/my-books/page.tsx`
- Modify: `src/app/(auth)/my-borrows/page.tsx`
- Modify: `src/app/(auth)/wishlist/page.tsx`
- Modify: `tests/mobile-ux-surface.test.mjs`

- [ ] **Step 1: Extend mobile test**

Append:

```js
test("authenticated mobile pages use responsive spacing and touch-friendly actions", () => {
  for (const path of [
    "src/app/(auth)/dashboard/page.tsx",
    "src/app/(auth)/my-books/page.tsx",
    "src/app/(auth)/my-borrows/page.tsx",
    "src/app/(auth)/wishlist/page.tsx",
  ]) {
    const source = read(path);
    assert.match(source, /space-y-|grid|flex/);
    assert.doesNotMatch(source, /w-\[1200px\]|min-w-\[900px\]/);
  }
});
```

- [ ] **Step 2: Run test to see current status**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
```

Expected: may pass already; use as guardrail.

- [ ] **Step 3: Apply consistent mobile page shell patterns**

For each page:

- Top-level spacing:

```tsx
<div className="space-y-4 md:space-y-6">
```

- Card grid:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
```

- Primary buttons/links:

```tsx
className="min-h-[44px]"
```

- Long text:

```tsx
className="break-words"
```

- [ ] **Step 4: Run tests/build**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/perpuskukaan-web
git add 'src/app/(auth)' tests/mobile-ux-surface.test.mjs
git commit -m "feat: polish authenticated mobile layouts"
```

---

## Task 6: Browser/Responsive Verification

**Files:**
- No source change required unless fixes are found.

- [ ] **Step 1: Start dev server**

```bash
cd ~/Desktop/perpuskukaan-web
pnpm dev:frontend
```

Expected: Next dev server running.

- [ ] **Step 2: Verify at mobile widths**

Use browser/devtools or screenshot workflow at:

- `375x812`
- `390x844`
- `768x1024`

Pages:

- `/`
- `/catalog`
- `/sign-in`
- `/dashboard`
- `/my-books`

Checklist:

- no horizontal scroll
- bottom nav visible only on auth mobile pages
- chat FAB reachable, not covering bottom nav primary actions too badly
- all tap targets visually at least 44px
- catalog search usable with keyboard open
- forms readable at 16px+

- [ ] **Step 3: Fix issues found**

Only change files relevant to failures. Re-run:

```bash
pnpm test
pnpm build
```

- [ ] **Step 4: Commit visual fixes if any**

```bash
git add src tests
git commit -m "fix: resolve mobile responsive QA issues"
```

---

## Final Verification

Run:

```bash
cd ~/Desktop/perpuskukaan-web
pnpm test
pnpm lint
pnpm build
```

Expected:

- tests pass
- lint 0 errors
- build succeeds

---

## Self-Review

### Spec Coverage

- Mobile device enhancement: bottom nav, catalog, chat FAB, page shells.
- UI/UX skill applied: touch target, accessibility, responsive, typography/color direction.
- Bot Layer surfaced in UI: `/api/chat` via mobile FAB.

### Placeholder Scan

No TBD/TODO/fill-later placeholders.

### Type Consistency

- Chat route path consistently `/api/chat`.
- Mobile nav component name consistently `MobileBottomNav`.
- Chat FAB component name consistently `MobileChatFab`.

---

Plan complete and saved to `docs/plans/2026-05-05-mobile-ux-enhancement.md`.
