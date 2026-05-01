# Autoresearch Ideas — Bundle Size Optimization

## Results Summary
- **Baseline**: 1456 KB
- **Best**: 1328 KB (-128 KB, -8.8%)
- **Winning changes**: `experimental.optimizePackageImports` + `reactCompiler: false`

## Kept (committed)
- ✅ `experimental.optimizePackageImports` for 16 packages — 120KB reduction
- ✅ `reactCompiler: false` — 8KB reduction (compiler runtime overhead)

## Discarded
- ❌ `modularizeImports` lucide-react — no effect, already tree-shaken
- ❌ remove react-qr-code unused dep — not in client bundle
- ❌ stub auth-client — breaks ConvexBetterAuthProvider
- ❌ `compress: true` — only HTTP compression
- ❌ `swcMinify` — deprecated in Next.js 16
- ❌ more optimizePackageImports (hookform, zod, etc) — no additional reduction
- ❌ webpack splitChunks for better-auth — no total size benefit
- ❌ `cacheComponents: false` — no effect
- ❌ `@better-fetch/fetch` in optimizePackageImports — no effect

## Remaining Chunks (hard to reduce)
| Chunk | Size | Content |
|-------|------|---------|
| 826 | 224KB | better-auth client |
| 3054666c | 196KB | React + convex client |
| framework | 188KB | Next.js framework core |
| 34 | 184KB | Next.js router internals |
| polyfills | 112KB | Standard JS polyfills |

## Future Ideas (require architecture changes)
- Lazy-load ConvexClientProvider via `next/dynamic` — defers 224+196KB but doesn't reduce total
- Server-only auth — remove better-auth from client entirely (major refactor)
- Replace convex client with lighter REST API calls (major refactor)
- Consider Preact instead of React for smaller framework size
- `output: 'standalone'` for deployment (server bundle, not client)
