# Autoresearch Ideas — Bundle Size Optimization

## Results Summary
- **Baseline**: 1456 KB
- **Best**: 1336 KB (-120 KB, -8.2%)
- **Winning change**: `experimental.optimizePackageImports` in next.config.ts

## Kept (committed)
- ✅ `experimental.optimizePackageImports` for 16 packages — 120KB reduction (-8.2%)

## Discarded
- ❌ `modularizeImports` for lucide-react — no effect, already tree-shaken
- ❌ remove react-qr-code unused dep — not in client bundle
- ❌ stub auth-client — breaks ConvexBetterAuthProvider (8KB reduction but build fails)
- ❌ `compress: true` — only HTTP compression, not file size
- ❌ `swcMinify: true` — deprecated in Next.js 16 (already default)
- ❌ more optimizePackageImports (hookform, zod, etc) — no additional reduction

## Future Ideas
- Dynamic import `ConvexClientProvider` — would defer better-auth (224KB) to after initial paint
- Lazy load dashboard/client.tsx with `next/dynamic`
- Analyze if better-auth can be tree-shaken more (only import needed submodules)
- Consider lighter auth alternative or server-only auth
- Check if `convex` client (196KB chunk) can be loaded lazily
- Enable `output: 'standalone'` for deployment optimization
- Use webpack-bundle-analyzer to find more tree-shaking opportunities
- Consider replacing `sonner` + `vaul` with native HTML alternatives
