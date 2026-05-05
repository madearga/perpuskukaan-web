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
