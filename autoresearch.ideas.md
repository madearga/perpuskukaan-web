# Autoresearch Ideas — Bundle Size Optimization (CONVERGED)

## Final Result
- **Baseline**: 1456 KB
- **Best**: 1328 KB (-128 KB, -8.8%)
- **Confidence**: 16.0× noise floor
- **Experiments**: 20 (2 kept, 18 discarded)
- **Status**: CONVERGED — no improvement in last 14 experiments

## Kept (committed)
- ✅ `experimental.optimizePackageImports` — 120KB
- ✅ `reactCompiler: false` — 8KB

## All Discarded
modularizeImports, remove react-qr-code, stub auth-client, compress:true, swcMinify, more optimizePackageImports, webpack splitChunks, cacheComponents:false, @better-fetch/fetch, ppr:incremental, inlineCss, optimizeCss, remove turbopack config, output:standalone, lazy load authClient (-8KB worse), delete 13 unused UI components

## Why Converged
1328 KB = 224KB better-auth + 196KB convex/react + 188KB Next.js framework + 184KB App Router + 112KB polyfills + 224KB remaining. All core deps. Only reducible via:
- Removing better-auth from client (224KB)
- Switching from React to Preact (~80KB savings)
- Dropping App Router for Pages Router (~184KB)
- Removing convex client (~76KB)
